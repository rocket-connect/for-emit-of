import { EventEmitter } from "events";

interface Options {
  event?: string;
}

export default <T>(
  emitter: EventEmitter,
  options?: Options
): AsyncIterator<T> => {
  if (!(emitter instanceof EventEmitter)) {
    throw new Error("emitter must be a instance of EventEmitter");
  }

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
