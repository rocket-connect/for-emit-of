/* eslint-disable @typescript-eslint/no-var-requires */
const forEmitOf = require("../dist");
const { EventEmitter } = require("events");

async function main() {
  let interval;

  try {
    const emitter = new EventEmitter();

    const iterator = forEmitOf(emitter, {
      inBetweenTimeout: 1000,
    });

    interval = setInterval(() => {
      emitter.emit("data", {});
    }, 2000); // greater than inBetweenTimeout ERROR!

    for await (const msg of iterator) {
      console.log(msg); // gets here once
    }
  } catch (error) {
    console.error(error);
    clearInterval(interval);
  }
}

main();
