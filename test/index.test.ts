/* eslint-disable @typescript-eslint/ban-ts-ignore */
import { expect } from "chai";
import { describe } from "mocha";
import forEmitOf from "../src";

describe("forEmitOf", () => {
  it("should be a function", () => {
    expect(forEmitOf).to.be.a("function");
  });

  it("should throw emitter must be a instance of EventEmitter", async () => {
    const str = "i am a string";

    try {
      // @ts-ignore
      forEmitOf(str);

      throw new Error();
    } catch ({ message }) {
      expect(message)
        .to.be.a("string")
        .to.equal("emitter must be a instance of EventEmitter");
    }
  });
});
