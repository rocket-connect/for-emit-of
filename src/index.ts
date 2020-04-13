import { EventEmitter } from "events";
import { Readable, Writable } from "stream";

interface Options {
  event?: string;
}

export default <T>(
  emitter: EventEmitter | Readable | Writable,
  options?: Options
): AsyncIterator<T> => {
  if (!(emitter instanceof EventEmitter)) {
    throw new Error("emitter must be a instance of EventEmitter");
  }

  ["readableEnded", "writableEnded"].forEach((key) => {
    if (key in emitter && Boolean(emitter[key])) {
      throw new Error("stream has ended");
    }
  });

  let buffers: T[] = [];
  let error: Error;
  let active = true;

  emitter.on("data", (buff) => buffers.push(buff));

  emitter.on("error", (err) => {
    error = err;
    active = false;
  });

  emitter.on("end", () => {
    active = false;
  });

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  async function* forEmitOf() {
    while (buffers.length || active) {
      if (error) {
        throw error;
      }

      const [result, ...restOfBuffers] = buffers;

      buffers = [...restOfBuffers];

      if (!result) {
        continue;
      }

      yield result;
    }
  }

  const iterator = forEmitOf();

  return iterator;
};
