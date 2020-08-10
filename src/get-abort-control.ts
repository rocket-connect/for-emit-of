import { Context } from "./types";
import { EventEmitter } from "events";

export const aborted = Symbol("abortedSymbol");

export interface AbortControl {
  onAbort: Promise<symbol>;
  abort: () => void;
}

export function getAbortControl<T>(context: Context): AbortControl {
  const emitter = new EventEmitter();
  return {
    onAbort: new Promise<symbol>((resolve) => {
      emitter.on("abort", () => {
        context.shouldYield = false;
        resolve(aborted);
      });
    }),
    abort: () => emitter.emit("abort"),
  };
}
