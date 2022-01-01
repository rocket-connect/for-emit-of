import * as util from "util";
export const sleep = util.promisify(setTimeout);
export const breath = util.promisify(setImmediate);
