import { sleep } from "./sleep";
import { instant } from "./instant";
import { Context } from "./types";

function hadTimedOut(deadline: number) {
  const now = instant();
  return deadline < now;
}

function getDeadline(value: number, context: Context): number {
  return context.lastResultAt + value;
}

export const timedOut = Symbol("TimedOutSymbol");

export interface TimeoutWrapper {
  awaiter: Promise<symbol>;
}

export function timeout(value: number, context: Context): TimeoutWrapper {
  function getAwaiter(): Promise<symbol> {
    return sleep(
      Math.max(getDeadline(value, context) - instant(), 0)
    ).then(() =>
      hadTimedOut(getDeadline(value, context)) ? timedOut : getAwaiter()
    );
  }

  const awaiter = getAwaiter();

  return {
    awaiter,
  };
}
