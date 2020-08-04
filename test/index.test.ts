/* eslint-disable @typescript-eslint/ban-ts-ignore */
import { expect } from "chai";
import { describe } from "mocha";
import forEmitOf from "../src";
import { Readable } from "stream";
import * as fs from "fs";
import * as path from "path";
import { EventEmitter } from "events";
import { sleep } from "../src/sleep";

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

      setTimeout(async () => {
        emitter.emit("data", { message: "test1" });
        await sleep(20);
        emitter.emit("data", { message: "test2" });
        await sleep(120);
        emitter.emit("data", { message: "test3" });
        emitter.emit("end");
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

    it("should throw an error when timeout is reached only after the first emitted event", async () => {
      const emitter = new EventEmitter();

      const iterator = forEmitOf<{ message: string }>(emitter, {
        timeout: 100,
      });

      setTimeout(async () => {
        await sleep(120);
        emitter.emit("data", { message: "test1" });
        emitter.emit("data", { message: "test2" });
        await sleep(120);
        emitter.emit("data", { message: "test5" });
        emitter.emit("end");
      }, 10);

      let result = "";
      let errorCaught!: Error;

      try {
        for await (const chunk of iterator) {
          sleep(10);
          result += chunk.message;
        }
      } catch (error) {
        errorCaught = error;
      }

      expect(result).to.equal("test1test2");
      expect(errorCaught).to.exist;
      expect(errorCaught.message).to.be.eq("Event timed out");
    });

    it("should throw an error when timeout is reached before the first emitted event if inBetweenTimeout are false", async () => {
      const emitter = new EventEmitter();

      const iterator = forEmitOf<{ message: string }>(emitter, {
        timeout: 100,
        inBetweenTimeout: false,
      });

      setTimeout(async () => {
        await sleep(120);
        emitter.emit("data", { message: "test1" });
        emitter.emit("data", { message: "test2" });
        await sleep(120);
        emitter.emit("data", { message: "test5" });
        emitter.emit("end");
      }, 10);

      let result = "";
      let errorCaught!: Error;

      try {
        for await (const chunk of iterator) {
          await sleep(10);
          result += chunk.message;
        }
      } catch (error) {
        errorCaught = error;
      }

      expect(result).to.equal("");
      expect(errorCaught).to.exist;
      expect(errorCaught.message).to.be.eq("Event timed out");
    });

    it("should throw an error when timeout is reached, but all health events must be processed even if it's emitted faster than it can be processed", async () => {
      const emitter = new EventEmitter();

      const iterator = forEmitOf<{ message: string }>(emitter, {
        timeout: 100,
      });

      setTimeout(async () => {
        emitter.emit("data", { message: "test1" });
        emitter.emit("data", { message: "test2" });
        emitter.emit("data", { message: "test3" });
        emitter.emit("data", { message: "test4" });
        await sleep(120);
        emitter.emit("data", { message: "test5" });
        emitter.emit("end");
      }, 10);

      let result = "";
      let errorCaught!: Error;

      try {
        for await (const chunk of iterator) {
          await sleep(10);
          result += chunk.message;
        }
      } catch (error) {
        errorCaught = error;
      }

      expect(result).to.equal("test1test2test3test4");
      expect(errorCaught).to.exist;
      expect(errorCaught.message).to.be.eq("Event timed out");
    });

    it("event processing must be interoperable", async () => {
      const emitter = new EventEmitter();

      const iterator = forEmitOf<{ message: string }>(emitter);

      let result = "";
      setTimeout(async () => {
        emitter.emit("data", { message: "test1" });
        emitter.emit("data", { message: "test2" });
        emitter.emit("data", { message: "test3" });
        emitter.emit("data", { message: "test4" });
        emitter.emit("end");
      }, 10);

      await sleep(10);
      for await (const chunk of iterator) {
        setImmediate(async () => {
          result += ` ${chunk.message}a `;
        });
        result += chunk.message;
      }
      await sleep(0);

      expect(result).to.equal(
        "test1 test1a test2 test2a test3 test3a test4 test4a "
      );
    });
  });
});
