/* eslint-disable @typescript-eslint/no-var-requires */
const forEmitOf = require("../dist");
const { EventEmitter } = require("events");

async function main() {
  const emitter = new EventEmitter();

  const iterator = forEmitOf(emitter, {
    limit: 10,
  });

  const interval = setInterval(() => {
    emitter.emit("data", {});
  }, 100);

  let msgCount = 0;

  for await (const msg of iterator) {
    msgCount += 1;
  }

  clearInterval(interval);

  console.log(msgCount); // 10
}

main();
