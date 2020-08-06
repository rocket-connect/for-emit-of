/* eslint-disable @typescript-eslint/no-var-requires */
const forEmitOf = require("../dist");
const { EventEmitter } = require("events");

async function main() {
  try {
    const emitter = new EventEmitter();

    const iterator = forEmitOf(emitter, {
      firstEventTimeout: 1000,
    });

    setTimeout(() => {
      emitter.emit("data", {});
    }, 2000); // greater than firstEventTimeout ERROR!

    for await (const msg of iterator) {
      console.log(msg); // never get here
    }
  } catch (error) {
    console.error(error);
  }
}

main();
