import { EventEmitter } from "events";
import { Readable, Writable } from "stream";
import * as util from "util";

const sleep = util.promisify(setTimeout);

interface Options {
  event: string;
  error: string;
}

const defaults: Options = { event: "data", error: "error" };

export default <T>(
  emitter: EventEmitter | Readable | Writable,
  options: Options = defaults
): AsyncIterable<T> => {
  options = { ...defaults, ...options };

  if (!(emitter instanceof EventEmitter)) {
    throw new Error("emitter must be a instance of EventEmitter");
  }

  if (emitter["readableEnded"] || emitter["writableEnded"]) {
    throw new Error("stream has ended");
  }

  let buffers: T[] = [];
  let error: Error;
  let active = true;

  emitter.on(options.event, (buff) => buffers.push(buff));

  emitter.once(options.error, (err) => {
    error = err;
  });

  ["close", "end"].forEach((event) => {
    emitter.once(event, () => {
      active = false;
    });
  });

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  async function* forEmitOf() {
    while (buffers.length || active) {
      if (error) {
        throw error;
      }

      /* We do not want to block the process!
         This call allows other processes
         a chance to execute.
       */
      await sleep(0);

      const [result, ...rest] = buffers;

      buffers = rest;

      if (!result) {
        continue;
      }

      yield result;
    }
  }

  const iterator: AsyncIterable<T> = forEmitOf();

  return iterator;
};
