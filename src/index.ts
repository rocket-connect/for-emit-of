import { EventEmitter } from "events";
import { Readable, Writable } from "stream";
import * as util from "util";

const sleep = util.promisify(setTimeout);

interface Defaults {
  event: string;
  error: string;
}

const defaults: Defaults = { event: "data", error: "error" };

interface Options {
  event?: string;
  error?: string;
  transform?: (buffer: Buffer) => any;
}

export default <T>(
  emitter: (EventEmitter | Readable | Writable) &
    (
      | {
          readableEnded: boolean;
          writableEnded: boolean;
        }
      | {}
    ),
  options?: Options & (Defaults | {})
): AsyncIterable<T> | AsyncIterable<Buffer> | AsyncIterable<any> => {
  if (!options) {
    options = defaults;
  }

  options = { ...defaults, ...options };

  if (!(emitter instanceof EventEmitter)) {
    throw new Error("emitter must be a instance of EventEmitter");
  }

  if (
    ("readableEnded" in emitter && Boolean(emitter.readableEnded)) ||
    ("writableEnded" in emitter && Boolean(emitter.writableEnded))
  ) {
    throw new Error("stream has ended");
  }

  if (options.transform) {
    const tof = typeof options.transform;

    if (tof !== "function") {
      throw new Error("transform must be a function");
    }
  }

  let buffers: Buffer[] = [];
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

      if (options.transform) {
        yield options.transform(result);
      }

      yield result;
    }
  }

  return forEmitOf();
};
