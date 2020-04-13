/* eslint-disable @typescript-eslint/ban-ts-ignore */
import { expect } from "chai";
import { describe } from "mocha";
import forEmitOf from "../src";
import { Readable } from "stream";

describe("forEmitOf", () => {
  it("should be a function", () => {
    expect(forEmitOf).to.be.a("function");
  });

  it("should throw emitter must be a instance of EventEmitter", () => {
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

  it("should throw stream has ended", async () => {
    const read = Readable.from("test");

    const buffers: any[] = [];

    for await (const buff of read) {
      buffers.push(buff);
    }

    try {
      forEmitOf(read);
    } catch ({ message }) {
      expect(message).to.be.a("string").to.equal("stream has ended");
    }
  });
});
