/* eslint-disable @typescript-eslint/ban-ts-ignore */
import { expect } from "chai";
import { describe } from "mocha";
import forEmitOf from "../src";
import { Readable } from "stream";
import * as fs from "fs";
import * as path from "path";

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
    const read = fs.createReadStream(path.join(__dirname, "../package.json"));

    try {
      // @ts-ignore
      read.readableEnded = true;

      forEmitOf(read);

      throw new Error();
    } catch ({ message }) {
      expect(message).to.be.a("string").to.equal("stream has ended");
    }
  });

  it("should return a iterator and iterate a string", async () => {
    const read = Readable.from("test");

    const iterator = forEmitOf<string>(read);

    let result = "";

    for await (const chunk of iterator) {
      result += chunk;
    }

    expect(result).to.equal("test");
  });
});
