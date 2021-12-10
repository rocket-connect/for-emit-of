import { Queue } from "./queue";
import { Options } from "./types";

export function debugRaceEnd(options: Options, winner: symbol | void) {
  if (options.debug) {
    console.log(`Finished response racing. Winner: ${String(winner)}`);
  }
}

export function debugRaceStart(options: Options) {
  if (options.debug) {
    console.log(
      "No more results to yield but emitter still active. Starting timeout race"
    );
  }
}

export function debugYieldLimit(options: Options) {
  if (options.debug) {
    console.log("Yielding limit reached! Stopping iterator");
  }
}

export function debugYielding(options: Options, events: Queue) {
  if (options.debug) {
    console.log(`Results to yield: ${events.length}`);
  }
}

export function debugKeepAlive(
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

export function debugKeepAliveEnding(
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

export function debugIteratorReturn(options: Options) {
  if (options.debug) {
    console.log("Iterator return called and process finalized");
  }
}
