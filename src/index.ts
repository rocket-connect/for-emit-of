import { EventEmitter } from "events";
import { sleep } from "./sleep";
import { timedOut, timeout } from "./timeout";
import {
  debugKeepAlive,
  debugYielding,
  debugYieldLimit,
  debugRaceStart,
  debugRaceEnd,
  debugKeepAliveEnding,
} from "./debugging";
import { Options, SuperEmitter, TimeoutRaceFactory, Context } from "./types";
import { instant } from "./instant";

const defaults = {
  event: "data",
  error: "error",
  end: ["close", "end"],
  keepAlive: 0,
  debug: false,
};

function waitResponse<T = any>(emitter: SuperEmitter, options: Options<T>) {
  return new Promise<void>((resolve, reject) => {
    emitter.once(options.event, () => {
      resolve();
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
  context: Context
) {
  const timeoutWrapper = timeout(options.inBetweenTimeout, context);
  return () => [waitResponse<T>(emitter, options), timeoutWrapper.awaiter];
}

function getFirstAwaiter<T>(
  options: Options<T>,
  emitter: SuperEmitter,
  context: Context
) {
  if (options.firstEventTimeout) {
    const firstTimeout = timeout(options.firstEventTimeout, context);
    return Promise.race([waitResponse(emitter, options), firstTimeout.awaiter]);
  }
  return waitResponse(emitter, options);
}

function switchRace<T>(
  options: Options<T>,
  emitter: SuperEmitter,
  getNextRace: () => TimeoutRaceFactory,
  context: Context
) {
  let timeoutRace: TimeoutRaceFactory;
  return () =>
    timeoutRace
      ? timeoutRace()
      : [
          getFirstAwaiter<T>(options, emitter, context).then((result) => {
            if (result !== timedOut) {
              timeoutRace = getNextRace();
            }
            return result;
          }),
        ];
}

function getTimeoutRace<T>(
  options: Options<T>,
  emitter: SuperEmitter,
  context: Context
) {
  return switchRace<T>(
    options,
    emitter,
    () => getInBetweenTimeoutRace(options, emitter, context),
    context
  );
}

function raceFactory<T>(
  options: Options<T>,
  emitter: SuperEmitter,
  context: Context
) {
  if (options.inBetweenTimeout) {
    return getTimeoutRace(options, emitter, context);
  }

  const getWaitResponse = () => [waitResponse<T>(emitter, options)];
  return options.firstEventTimeout
    ? switchRace(options, emitter, () => getWaitResponse, context)
    : getWaitResponse;
}

function forEmitOf<T = any>(emitter: SuperEmitter): AsyncIterable<T>;
function forEmitOf<T = any>(
  emitter: SuperEmitter,
  options: Options<T>
): AsyncIterable<T>;

function forEmitOf<T = any>(emitter: SuperEmitter, options?: Options<T>) {
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

  let events = [];
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
    events = [];
    emitter.removeListener(options.event, eventListener);
    emitter.removeListener(options.error, errorListener);
    options.end.forEach((event) => emitter.removeListener(event, endListener));
  };

  emitter.on(options.event, eventListener);
  emitter.once(options.error, errorListener);
  options.end.forEach((event) => emitter.once(event, endListener));

  const getRaceItems = raceFactory<T>(options, emitter, context);

  async function* generator() {
    let shouldYield = true;
    let countEvents = 0;
    let countKeepAlive = 0;
    const start = process.hrtime();

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
    while (shouldYield && (events.length || active)) {
      if (error) {
        throw error;
      }

      while (shouldYield && events.length > 0) {
        debugYielding(options, events);
        /* We do not want to block the process!
            This call allows other processes
            a chance to execute.
        */
        await sleep(0);

        const [event, ...rest] = events;
        events = rest;

        yield options.transform ? options.transform(event) : event;

        countEvents++;

        if (options.limit && countEvents >= options.limit) {
          debugYieldLimit(options);
          shouldYield = false;
        }
      }

      if (active && !error) {
        debugRaceStart(options);
        const winner = await Promise.race(getRaceItems());
        debugRaceEnd(options, winner);

        if (winner === timedOut) {
          removeListeners();
          active = false;
          throw Error("Event timed out");
        }
      }
    }
    active = false;
    removeListeners();
  }

  return generator();
}

export = forEmitOf;
