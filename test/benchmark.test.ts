import { expect } from "chai";
import { createReadStream } from "fs";
import readline = require("readline");
import forEmitOf = require("../src");

const MICROSECOND_SCALE = 1000000;
describe("benchmarking", () => {
  it("should perform well with noSleep as false", async () => {
    const start = Date.now();
    const rl = readline.createInterface({
      input: createReadStream("test/big.txt"),
    });
    const iterable = forEmitOf(rl, {
      event: "line",
      noSleep: false,
    });

    let i = 0;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for await (const line of iterable) {
      i += 1;
    }
    const end = Date.now();

    expect(((end - start) * MICROSECOND_SCALE) / i).to.be.lessThan(
      MICROSECOND_SCALE / 100
    );
  });
  it("should perform well with noSleep as true", async () => {
    const start = Date.now();
    const rl = readline.createInterface({
      input: createReadStream("test/big.txt"),
    });
    const iterable = forEmitOf(rl, {
      event: "line",
      noSleep: false,
    });

    let i = 0;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for await (const line of iterable) {
      i += 1;
    }
    const end = Date.now();

    expect(((end - start) * MICROSECOND_SCALE) / i).to.be.lessThan(
      MICROSECOND_SCALE / 100
    );
  });
});
