import { EventEmitter } from "events";
import { breath } from "./sleep";
import { timedOut, timeout } from "./timeout";
import {
  debugKeepAlive,
  debugYielding,
  debugYieldLimit,
  debugRaceStart,
  debugRaceEnd,
  debugKeepAliveEnding,
  debugIteratorReturn,
} from "./debugging";
import { Options, SuperEmitter, TimeoutRaceFactory, Context } from "./types";
import { instant } from "./instant";
import { getQueue } from "./queue";

const defaults = {
  event: "data",
  error: "error",
  end: ["close", "end"],
  keepAlive: 0,
  debug: false,
  noSleep: false,
};

function waitResponse<T = any>(
  emitter: SuperEmitter,
  options: Options<T>,
  eventListener: (...args: any[]) => void
) {
  emitter.off(options.event, eventListener);
  return new Promise<any>((resolve, reject) => {
    emitter.once(options.event, (value) => {
      emitter.on(options.event, eventListener);
      resolve({ value });
      emitter.removeListener(options.error, reject);
      options.end.forEach((event) => emitter.removeListener(event, resolve));
    });
    emitter.once(options.error, reject);
    options.end.forEach((event) => emitter.once(event, resolve));
  });
}

function getInBetweenTimeoutRace<T>(
  options: Options<T>,
  emitter: SuperEmitter,
  context: Context,
  eventListener: (...args: any[]) => void
) {
  const timeoutWrapper = timeout(options.inBetweenTimeout, context);
  return () => [
    waitResponse<T>(emitter, options, eventListener),
    timeoutWrapper.awaiter,
  ];
}

function getFirstAwaiter<T>(
  options: Options<T>,
  emitter: SuperEmitter,
  context: Context,
  eventListener: (...args: any[]) => void
) {
  if (options.firstEventTimeout) {
    const firstTimeout = timeout(options.firstEventTimeout, context);
    return Promise.race([
      waitResponse(emitter, options, eventListener),
      firstTimeout.awaiter,
    ]);
  }
  return waitResponse(emitter, options, eventListener);
}

function switchRace<T>(
  options: Options<T>,
  emitter: SuperEmitter,
  getNextRace: () => TimeoutRaceFactory,
  context: Context,
  eventListener: (...args: any[]) => void
) {
  let timeoutRace: TimeoutRaceFactory;
  return () =>
    timeoutRace
      ? timeoutRace()
      : [
          getFirstAwaiter<T>(options, emitter, context, eventListener).then(
            (result) => {
              if (result !== timedOut) {
                timeoutRace = getNextRace();
              }
              return result;
            }
          ),
        ];
}

function getTimeoutRace<T>(
  options: Options<T>,
  emitter: SuperEmitter,
  context: Context,
  eventListener: (...args: any[]) => void
) {
  return switchRace<T>(
    options,
    emitter,
    () => getInBetweenTimeoutRace(options, emitter, context, eventListener),
    context,
    eventListener
  );
}

function raceFactory<T>(
  options: Options<T>,
  emitter: SuperEmitter,
  context: Context,
  eventListener: (...args: any[]) => void
) {
  if (options.inBetweenTimeout) {
    return getTimeoutRace(options, emitter, context, eventListener);
  }

  const getWaitResponse = () => [
    waitResponse<T>(emitter, options, eventListener),
  ];
  return options.firstEventTimeout
    ? switchRace(
        options,
        emitter,
        () => getWaitResponse,
        context,
        eventListener
      )
    : getWaitResponse;
}

function forEmitOf<T = any>(emitter: SuperEmitter): AsyncIterable<T>;
function forEmitOf<T = any>(
  emitter: SuperEmitter,
  options: Options<T>
): AsyncIterable<T>;

function forEmitOf<T = any>(
  emitter: SuperEmitter,
  options?: Options<T>
): AsyncIterable<T> {
  if (!options) {
    options = defaults;
  }

  options = { ...defaults, ...options };

  if (!(emitter instanceof EventEmitter)) {
    throw new Error("emitter must be a instance of EventEmitter");
  }

  if (emitter.readableEnded || emitter.writableEnded) {
    throw new Error("stream has ended");
  }

  if (options.transform) {
    if (typeof options.transform !== "function") {
      throw new Error("transform must be a function");
    }
  }

  if (!Array.isArray(options.end)) {
    throw new Error("end must be an array");
  }

  let events = getQueue();
  let error: Error;
  let active = true;
  const context: Context = {
    lastResultAt: 0,
  };

  const eventListener = <T>(event: T) => {
    context.lastResultAt = instant();
    return events.push(event);
  };
  const endListener = () => {
    active = false;
  };
  const errorListener = (err: Error) => {
    error = err;
  };
  const removeListeners = () => {
    events = getQueue<T>();
    emitter.removeListener(options.event, eventListener);
    emitter.removeListener(options.error, errorListener);
    options.end.forEach((event) => emitter.removeListener(event, endListener));
  };

  emitter.on(options.event, eventListener);
  emitter.once(options.error, errorListener);
  options.end.forEach((event) => emitter.once(event, endListener));

  const getRaceItems = raceFactory<T>(options, emitter, context, eventListener);

  function generator() {
    let completed = false;
    let shouldYield = true;
    let countEvents = 0;
    let countKeepAlive = 0;
    const start = process.hrtime();
    async function runReturn(value?: any) {
      if (!completed) {
        shouldYield = false;
        completed = true;
        removeListeners();
        debugIteratorReturn(options);
      }
      return { done: true, value } as IteratorResult<any>;
    }

    if (
      options.keepAlive &&
      (!options.firstEventTimeout || !options.inBetweenTimeout)
    ) {
      const keepAlive = () => {
        if (
          active &&
          !error &&
          (countEvents === 0 || !options.inBetweenTimeout)
        ) {
          countKeepAlive = debugKeepAlive(options, countKeepAlive, start);
          setTimeout(keepAlive, options.keepAlive);
        } else {
          debugKeepAliveEnding(options, countKeepAlive, start);
        }
      };
      setTimeout(keepAlive, options.keepAlive);
    }

    context.lastResultAt = instant();
    return {
      [Symbol.asyncIterator]() {
        return {
          async next(): Promise<IteratorResult<T>> {
            if (error) {
              throw error;
            }

            if (shouldYield && !events.length && active) {
              debugRaceStart(options);
              const winner = await Promise.race(getRaceItems());
              debugRaceEnd(options, winner);

              if (winner === timedOut) {
                removeListeners();
                active = false;
                throw Error("Event timed out");
              }
              if (winner) {
                return {
                  done: false,
                  value: options.transform
                    ? options.transform(winner.value)
                    : winner.value,
                };
              }
            }
            if (!shouldYield || (events.length === 0 && !active)) {
              return runReturn();
            }
            debugYielding(options, events);
            if (!options.noSleep) {
              /* We do not want to block the process!
                This call allows other processes
                a chance to execute.
              */
              await breath();
            }

            const event = events.shift();
            countEvents++;

            if (options.limit && countEvents >= options.limit) {
              debugYieldLimit(options);
              shouldYield = false;
            }
            return {
              done: false,
              value: options.transform ? options.transform(event) : event,
            };
          },
          return: runReturn,
        };
      },
    };
  }

  return generator();
}

export = forEmitOf;
