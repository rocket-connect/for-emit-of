/* eslint-disable @typescript-eslint/ban-ts-ignore */
import { expect } from "chai";
import { describe } from "mocha";
import forEmitOf from "../src";
import { Readable } from "stream";
import * as fs from "fs";
import * as path from "path";
import { EventEmitter } from "events";

describe("forEmitOf", () => {
  it("should be a function", () => {
    expect(forEmitOf).to.be.a("function");
  });

  describe("validation", () => {
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
      try {
        const read = fs.createReadStream(
          path.join(__dirname, "../package.json")
        );

        // @ts-ignore
        read.readableEnded = true;

        forEmitOf(read);

        throw new Error();
      } catch ({ message }) {
        expect(message).to.be.a("string").to.equal("stream has ended");
      }
    });

    it("should throw transform must be a function", () => {
      try {
        const read = fs.createReadStream(
          path.join(__dirname, "../package.json")
        );

        // @ts-ignore
        forEmitOf(read, { transform: [] });

        throw new Error();
      } catch ({ message }) {
        expect(message)
          .to.be.a("string")
          .to.equal("transform must be a function");
      }
    });
  });

  describe("functionality", () => {
    it("should return a iterator and iterate a string", async () => {
      const read = Readable.from("test");

      const iterator = forEmitOf<string>(read);

      let result = "";

      for await (const chunk of iterator) {
        result += chunk;
      }

      expect(result).to.equal("test");
    });

    it("should return a iterator and use a transform to JSON", async () => {
      const read = fs.createReadStream(path.join(__dirname, "../package.json"));

      const iterator = forEmitOf<string>(read, {
        transform: (buff) => {
          return JSON.parse(buff.toString());
        },
      });

      for await (const chunk of iterator) {
        expect(chunk)
          .to.be.a("object")
          .to.have.property("name")
          .to.equal("for-emit-of");

        break;
      }
    });

    it("should catch and throw the error in a async context", async () => {
      const emitter = new EventEmitter();

      const iterator = forEmitOf(emitter);

      try {
        emitter.emit("error", { message: "test" });

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        for await (const chunk of iterator) {
        }
      } catch ({ message }) {
        expect(message).to.equal("test");
      }
    });
  });
});
