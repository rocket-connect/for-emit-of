import { sleep } from "./sleep";

function instant() {
  const [s, ns] = process.hrtime();
  return s * 1e3 + ns / 1e6;
}

function hadTimedOut(deadline: number) {
  const now = instant();
  return deadline < now;
}
function getDeadline(value: number) {
  return instant() + value;
}

const timedOut = Symbol("TimedOutSymbol");
export interface TimeoutWrapper {
  awaiter: Promise<symbol>;
  updateDeadline(): void;
}

export function timeout(value: number): TimeoutWrapper {
  let deadline = getDeadline(value);
  function getAwaiter(): Promise<symbol> {
    return sleep(Math.max(deadline - instant(), 0)).then(() =>
      hadTimedOut(deadline) ? timedOut : getAwaiter()
    );
  }
  const awaiter = getAwaiter();

  return {
    awaiter,
    updateDeadline() {
      deadline = getDeadline(value);
    },
  };
}
