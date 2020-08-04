import { sleep } from "./sleep";

function instant() {
  const [s, ms] = process.hrtime();
  return s * 1e3 + ms / 1e6;
}

function hadTimedOut(deadline: number) {
  const now = instant();
  return deadline < now;
}
function getDeadline(value: number) {
  return instant() + value;
}

export const timedOut = Symbol("TimedOutSymbol");
export interface TimeoutWrapper {
  awaiter(): Promise<symbol>;
  updateDeadline(): void;
}

export function timeout(value: number): TimeoutWrapper {
  let deadline = getDeadline(value);
  function getAwaiter(): Promise<symbol> {
    return sleep(deadline - instant()).then(() =>
      hadTimedOut(deadline) ? timedOut : getAwaiter()
    );
  }
  const awaiter = getAwaiter();

  return {
    awaiter: () => awaiter,
    updateDeadline() {
      deadline = getDeadline(value);
    },
  };
}
