import { EventEmitter } from "events";
import { Readable, Writable } from "stream";
import { timeout, TimeoutWrapper } from "./timeout";
import { sleep } from "./sleep";

const defaults = {
  event: "data",
  error: "error",
  end: ["close", "end"],
  inBetweenTimeout: true,
};

interface Options<T = any> {
  event?: string;
  error?: string;
  end?: string[];
  timeout?: number;
  inBetweenTimeout?: boolean;
  transform?: (buffer: Buffer) => T;
}

type SuperEmitter = (EventEmitter | Readable | Writable) & {
  readableEnded?: boolean;
  writableEnded?: boolean;
};

function waitResponse<T = any>(emitter: SuperEmitter, options: Options<T>) {
  return new Promise<symbol>((resolve, reject) => {
    emitter.once(options.event, () => {
      resolve();
      emitter.removeListener(options.error, reject);
      options.end.forEach((event) => emitter.removeListener(event, resolve));
    });
    emitter.once(options.error, reject);
    options.end.forEach((event) => emitter.once(event, resolve));
  });
}

async function awaitAndResetTimeout<T>(
  emitter: SuperEmitter,
  options: Options<T>,
  timeoutWrapper: TimeoutWrapper
) {
  const result = await waitResponse(emitter, options);
  timeoutWrapper.updateDeadline();
  return result;
}

function getTimeoutRace<T>(options: Options<T>, emitter: SuperEmitter) {
  const timeoutWrapper = timeout(options.timeout);
  return () => [
    awaitAndResetTimeout<T>(emitter, options, timeoutWrapper),
    timeoutWrapper.awaiter,
  ];
}

function getInBetweenTimeout<T>(options: Options<T>, emitter: SuperEmitter) {
  let timeoutRace: () => Array<Promise<symbol>>;
  return () => {
    if (!timeoutRace) {
      timeoutRace = getTimeoutRace(options, emitter);
      return [waitResponse(emitter, options)];
    }
    return timeoutRace();
  };
}

function raceFactory<T>(options: Options<T>, emitter: SuperEmitter) {
  if (options.timeout) {
    if (options.inBetweenTimeout) {
      return getInBetweenTimeout(options, emitter);
    }
    return getTimeoutRace<T>(options, emitter);
  }

  return () => [waitResponse<T>(emitter, options)];
}

function forEmitOf<T = any>(emitter: SuperEmitter): AsyncIterable<T>;
function forEmitOf<T = any>(
  emitter: SuperEmitter,
  options: Options<T>
): AsyncIterable<T>;

/**
 * @param {import('events').EventEmitter} emitter
 * @param {{event: string, transform: () => any}} options
 */
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

  let events = [];
  let error: Error;
  let active = true;
  emitter.on(options.event, (event) => events.push(event));
  emitter.once(options.error, (err) => {
    error = err;
  });
  const endListener = () => {
    active = false;
  };
  options.end.forEach((event) => {
    emitter.once(event, endListener);
  });

  const getRaceItems = raceFactory<T>(options, emitter);

  async function* generator() {
    while (events.length || active) {
      if (error) {
        throw error;
      }
      while (events.length > 0) {
        /* We do not want to block the process!
            This call allows other processes
            a chance to execute.
        */
        await sleep(0);
        const [event, ...rest] = events;
        events = rest;

        yield options.transform ? options.transform(event) : event;
      }
      if (active) {
        if (await Promise.race(getRaceItems())) {
          throw Error("Event timed out");
        }
      }
    }
  }

  return generator();
}

export default forEmitOf;
