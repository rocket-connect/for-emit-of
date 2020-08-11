/* eslint-disable @typescript-eslint/ban-ts-ignore */
import { expect, use } from "chai";
import { EventEmitter } from "events";
import * as fs from "fs";
import { describe } from "mocha";
import * as path from "path";
import { Readable } from "stream";
import forEmitOf from "../src";
import { sleep } from "../src/sleep";
import { stub } from "sinon";
import sinonChai from "sinon-chai";
import debugging = require("../src/debugging");

use(sinonChai);

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

    it("should throw end must be an array", () => {
      try {
        const read = new EventEmitter();

        // @ts-ignore
        forEmitOf(read, { end: {} });

        throw new Error();
      } catch ({ message }) {
        expect(message).to.be.a("string").to.equal("end must be an array");
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
        end: ["end", "close"],
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
        inBetweenTimeout: 100,
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
        inBetweenTimeout: 100,
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

      expect(result).to.equal("test1test2");
      expect(errorCaught).to.exist;
      expect(errorCaught.message).to.be.eq("Event timed out");
    });

    it("should throw an error when first event timeout is reached before the first emitted event when firstEventTimeout is informed", async () => {
      const emitter = new EventEmitter();

      const iterator = forEmitOf<{ message: string }>(emitter, {
        inBetweenTimeout: 100,
        firstEventTimeout: 50,
      });

      setTimeout(async () => {
        await sleep(60);
        emitter.emit("data", { message: "test1" });
        await sleep(0);
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

    it("should throw an error when first event timeout is reached before the first emitted event when firstEventTimeout is informed and inBetweenTimeout is not", async () => {
      const emitter = new EventEmitter();

      const iterator = forEmitOf<{ message: string }>(emitter, {
        firstEventTimeout: 50,
      });

      setTimeout(async () => {
        await sleep(60);
        emitter.emit("data", { message: "test1" });
        await sleep(0);
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

    it("should iterate without timeout when first event timeout is not reached before the first emitted event when firstEventTimeout is informed and inBetweenTimeout is not", async () => {
      const emitter = new EventEmitter();

      const iterator = forEmitOf<{ message: string }>(emitter, {
        firstEventTimeout: 100,
      });

      setTimeout(async () => {
        await sleep(60);
        emitter.emit("data", { message: "test1" });
        await sleep(0);
        emitter.emit("data", { message: "test2" });
        await sleep(120);
        emitter.emit("data", { message: "test3" });
        emitter.emit("end");
      }, 10);

      let result = "";

      for await (const chunk of iterator) {
        await sleep(10);
        result += chunk.message;
      }

      expect(result).to.equal("test1test2test3");
    });

    it("should throw an error when timeout is reached, but all health events must be processed even if it's emitted faster than it can be processed", async () => {
      const emitter = new EventEmitter();

      const iterator = forEmitOf<{ message: string }>(emitter, {
        inBetweenTimeout: 100,
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

    it("should not throw timeout for delays caused by the 'for await of' using the generated Async Iterable", async () => {
      const emitter = new EventEmitter();

      const iterator = forEmitOf<{ message: string }>(emitter, {
        firstEventTimeout: 100,
        inBetweenTimeout: 100,
      });

      setTimeout(async () => {
        emitter.emit("data", { message: "test1" });
        emitter.emit("data", { message: "test2" });
        await sleep(80);
        emitter.emit("data", { message: "test3" });
        await sleep(80);
        emitter.emit("data", { message: "test4" });
        emitter.emit("end");
      }, 10);

      let result = "";

      for await (const chunk of iterator) {
        await sleep(50);
        result += chunk.message;
      }

      expect(result).to.equal("test1test2test3test4");
    });

    it("event processing must be non blocking", async () => {
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

    it("event processing must emit even falsy values", async () => {
      const emitter = new EventEmitter();

      const iterator = forEmitOf<{ message: string }>(emitter);

      let result = "";
      setTimeout(async () => {
        emitter.emit("data", false);
        emitter.emit("data", 0);
        emitter.emit("data", "");
        emitter.emit("data", "not empty");
        emitter.emit("end");
      }, 10);

      await sleep(10);
      for await (const chunk of iterator) {
        result += `[${chunk}] `;
      }
      await sleep(0);

      expect(result).to.equal("[false] [0] [] [not empty] ");
    });

    it("should the number of iterations respect the limit even if the number of events is higher", async () => {
      const emitter = new EventEmitter();

      const iterator = forEmitOf<{ message: string }>(emitter, { limit: 10 });
      let count = 0;
      let result = "";
      setTimeout(async () => {
        emitter.emit("data", false);
        emitter.emit("data", 0);
        emitter.emit("data", "");
        emitter.emit("data", "not empty");
        emitter.emit("data", "not empty 2");
        emitter.emit("data", "not empty 2");
        emitter.emit("data", "not empty 3");
        emitter.emit("data", "not empty 4");
        emitter.emit("data", "not empty 5");
        emitter.emit("data", "not empty 6");
        emitter.emit("data", "not empty 7");
        emitter.emit("end");
      }, 10);

      await sleep(10);
      for await (const chunk of iterator) {
        count++;
        result += `[${chunk}] `;
      }
      await sleep(0);
      expect(count).to.equal(10);
      expect(result).to.be.eqls(
        "[false] [0] [] [not empty] [not empty 2] [not empty 2] [not empty 3] [not empty 4] [not empty 5] [not empty 6] "
      );
    });

    it("should make all iterations if the value of limit is 0 ", async () => {
      const emitter = new EventEmitter();

      const iterator = forEmitOf<{ message: string }>(emitter, { limit: 0 });
      let count = 0;
      let result = "";
      setTimeout(async () => {
        emitter.emit("data", false);
        emitter.emit("data", 0);
        emitter.emit("data", "");
        emitter.emit("data", "not empty");
        emitter.emit("data", "not empty 2");
        emitter.emit("data", "not empty 2");
        emitter.emit("data", "not empty 3");
        emitter.emit("data", "not empty 4");
        emitter.emit("data", "not empty 5");
        emitter.emit("data", "not empty 6");
        emitter.emit("data", "not empty 7");
        emitter.emit("end");
      }, 10);

      await sleep(10);
      for await (const chunk of iterator) {
        count++;
        result += `[${chunk}] `;
      }
      await sleep(0);
      expect(count).to.equal(11);
      expect(result).to.be.eqls(
        "[false] [0] [] [not empty] [not empty 2] [not empty 2] [not empty 3] [not empty 4] [not empty 5] [not empty 6] [not empty 7] "
      );
    });

    it("should the number of iterations respect the limit even if the number of events is higher", async () => {
      const emitter = new EventEmitter();

      const iterator = forEmitOf<{ message: string }>(emitter, { limit: 10 });
      let count = 0;
      let result = "";
      setTimeout(async () => {
        emitter.emit("data", false);
        emitter.emit("data", 0);
        emitter.emit("data", "");
        emitter.emit("data", "not empty");
        emitter.emit("data", "not empty 2");
        emitter.emit("data", "not empty 2");
        emitter.emit("data", "not empty 3");
        emitter.emit("data", "not empty 4");
        emitter.emit("data", "not empty 5");
        emitter.emit("data", "not empty 6");
        emitter.emit("data", "not empty 7");
        emitter.emit("end");
      }, 10);

      await sleep(10);
      for await (const chunk of iterator) {
        count++;
        result += `[${chunk}] `;
      }
      await sleep(0);
      expect(count).to.equal(10);
      expect(result).to.be.eqls(
        "[false] [0] [] [not empty] [not empty 2] [not empty 2] [not empty 3] [not empty 4] [not empty 5] [not empty 6] "
      );
    });

    it("should make all iterations if has no limit ", async () => {
      const emitter = new EventEmitter();

      const iterator = forEmitOf<{ message: string }>(emitter);
      let count = 0;
      let result = "";
      setTimeout(async () => {
        emitter.emit("data", false);
        emitter.emit("data", 0);
        emitter.emit("data", "");
        emitter.emit("data", "not empty");
        emitter.emit("data", "not empty 2");
        emitter.emit("data", "not empty 2");
        emitter.emit("data", "not empty 3");
        emitter.emit("data", "not empty 4");
        emitter.emit("data", "not empty 5");
        emitter.emit("data", "not empty 6");
        emitter.emit("data", "not empty 7");
        emitter.emit("end");
      }, 10);

      await sleep(10);
      for await (const chunk of iterator) {
        count++;
        result += `[${chunk}] `;
      }
      await sleep(0);
      expect(count).to.equal(11);
      expect(result).to.be.eqls(
        "[false] [0] [] [not empty] [not empty 2] [not empty 2] [not empty 3] [not empty 4] [not empty 5] [not empty 6] [not empty 7] "
      );
    });

    it("keep alive should keep process running until emitter ends", async () => {
      const emitter = new EventEmitter();
      let finished = false;

      const iterator = forEmitOf<{ message: string }>(emitter, {
        keepAlive: 10,
      });

      process.nextTick(async () => {
        emitter.emit("data", "1");
        await sleep(5);
        emitter.emit("data", "2");
        await sleep(10);
        emitter.emit("data", "3");
        await sleep(30);
        finished = true;
        emitter.emit("end");
      });
      let result = "";

      for await (const chunk of iterator) {
        result += `[${chunk}] `;
      }

      expect(result).to.be.eq("[1] [2] [3] ");
      expect(finished).to.be.true;
    });

    it("should abort the iteration if a break is used", async () => {
      const emitter = new EventEmitter();
      let counter = 0;
      stub(debugging, "debugYielding");
      stub(debugging, "debugIteratorReturn");

      const iterator = forEmitOf<{ message: string }>(emitter);

      process.nextTick(async () => {
        emitter.emit("data", "1");
        emitter.emit("data", "2");
        emitter.emit("data", "3");
        emitter.emit("end");
      });
      let result = "";

      for await (const chunk of iterator) {
        counter++;
        result += `[${chunk}] `;
        if (counter > 1) {
          break;
        }
      }

      expect(debugging.debugYielding).to.have.been.calledTwice;
      expect(debugging.debugIteratorReturn).to.have.been.called;
      expect(result).to.be.eq("[1] [2] ");
      expect(counter).to.be.eq(2);
    });
  });
});
