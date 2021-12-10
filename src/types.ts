import { EventEmitter } from "events";
import { Readable, Writable } from "stream";

/**
 * Options to define AsyncIterable behavior
 */
export interface Options<T = any> {
  /**
   * The event that generates the AsyncIterable items
   */
  event?: string;
  /**
   * The event to be listen for errors, default "error"
   */
  error?: string;
  /**
   * The events to be listen for finalization, default ["end", "close"]
   */
  end?: string[];
  /**
   * The timeout for the first event emission. If not informed, the AsyncIterable will wait indefinitely
   * for it. If it is informed and the timeout is reached, an error is thrown
   */
  firstEventTimeout?: number;
  /**
   * The timeout for between each event emission. If not informed, the AsyncIterable will wait indefinitely
   * for them. If it is informed and the timeout is reached, an error is thrown
   */
  inBetweenTimeout?: number;
  /**
   * A transformation to be used for each iterable element before yielding it. If not informed,
   * the value will be yield as is.
   */
  transform?: (buffer: Buffer) => T;
  /**
   * Max number of items to be yielded. If not informed, it'll yield all items of the iterable.
   */
  limit?: number;
  /**
   * The max interval, in milliseconds, of idleness for the iterable generated. For the iterable
   * to kept node process running, it need to have at least one task not based on events created,
   * this property defines the keepAlive time for such task. If timeout is used, this property is
   * ignored. If 0 is informed, the keepAlive is disabled. Default: 0
   */
  keepAlive?: number;
  /**
   * if some debug code lines will be printed. Useful to understand how for-emit-of are performing.
   * Default: false
   */
  debug?: boolean;
  /**
   * Disable sleeping between iterations
   */
  noSleep?: boolean;
}

export interface Context {
  lastResultAt: number;
}

export type SuperEmitter = (EventEmitter | Readable | Writable) & {
  readableEnded?: boolean;
  writableEnded?: boolean;
};

export type TimeoutRaceFactory = () => Array<Promise<void | symbol>>;
export const Abort = Symbol("AbortIterable");
