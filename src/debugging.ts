interface Options {
  debug: boolean;
}

export function debugRaceEnd<T = any>(options: Options, winner: symbol | void) {
  if (options.debug) {
    console.log(`Finished response racing. Winner: ${String(winner)}`);
  }
}
export function debugRaceStart<T = any>(options: Options) {
  if (options.debug) {
    console.log(
      "No more results to yield but emitter still active. Starting timeout race"
    );
  }
}
export function debugYieldLimit<T = any>(options: Options) {
  if (options.debug) {
    console.log("Yielding limit reached! Stopping iterator");
  }
}
export function debugYielding<T = any>(options: Options, events: any[]) {
  if (options.debug) {
    console.log(`Results to yield: ${events.length}`);
  }
}
export function debugKeepAlive<T = any>(
  options: Options,
  countKeepAlive: number,
  start: [number, number]
) {
  if (options.debug) {
    countKeepAlive++;
    const current = process.hrtime(start);
    const seconds = current[0] + current[1] / 1e9;
    console.log(
      `${countKeepAlive} keepalive cycles, ${seconds} secs, ${(
        countKeepAlive / seconds
      ).toFixed(2)} cycles per second`
    );
  }
  return countKeepAlive;
}

export function debugKeepAliveEnding<T = any>(
  options: Options,
  countKeepAlive: number,
  start: [number, number]
) {
  if (options.debug) {
    const current = process.hrtime(start);
    const seconds = current[0] + current[1] / 1e9;
    console.log(
      `Finishing keep alive control: ${countKeepAlive} keepalive cycles, ${seconds} secs, ${(
        countKeepAlive / seconds
      ).toFixed(2)} cycles per second`
    );
  }
}
