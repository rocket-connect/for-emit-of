/* eslint-disable @typescript-eslint/ban-ts-ignore */
import { expect } from "chai";
import { describe } from "mocha";
import forEmitOf from "../src";
import { Readable } from "stream";
import * as fs from "fs";
import * as path from "path";
import { EventEmitter } from "events";

describe("forEmitOf", () => {
  describe("validation", () => {
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
      try {
        const read = new EventEmitter();

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
      const read = fs.createReadStream(path.join(__dirname, "./test.json"));

      const iterator = forEmitOf<string>(read, {
        transform: (buff) => {
          return JSON.parse(buff.toString());
        },
      });

      for await (const chunk of iterator) {
        expect(chunk)
          .to.be.a("object")
          .to.have.property("message")
          .to.equal("test");

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

        throw new Error();
      } catch ({ message }) {
        expect(message).to.equal("test");
      }
    });

    it("should continue if no event is found", async () => {
      const emitter = new EventEmitter();

      const iterator = forEmitOf(emitter);

      setTimeout(() => {
        emitter.emit("data", false);

        emitter.emit("data", { message: "test" });

        emitter.emit("close");
      }, 100);

      emitter.emit("data", { message: "test" });

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for await (const chunk of iterator) {
      }
    });

    it("should throw an error when timeout is reached", async () => {
      const emitter = new EventEmitter();

      const iterator = forEmitOf<{ message: string }>(emitter, {
        timeout: 100,
      });

      setTimeout(() => {
        emitter.emit("data", { message: "test1" });
        setTimeout(() => {
          emitter.emit("data", { message: "test2" });
          setTimeout(() => {
            emitter.emit("data", { message: "test3" });
            emitter.emit("close");
          }, 120);
        }, 20);
      }, 10);

      let result = "";
      let errorCaught!: Error;

      try {
        for await (const chunk of iterator) {
          result += chunk.message;
        }
      } catch (error) {
        errorCaught = error;
      }

      expect(result).to.equal("test1test2");
      expect(errorCaught).to.exist;
      expect(errorCaught.message).to.be.eq("Event timed out");
    });
  });
});
