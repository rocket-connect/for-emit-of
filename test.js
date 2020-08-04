const forEmitOf = require("./dist");
const fs = require("fs");
const path = require("path");
const sleep = require("util").promisify(setTimeout);

async function main() {
  const readStream = fs.createReadStream(
    path.join(__dirname, "./package.json")
  );

  const iterator = forEmitOf(readStream, {
    transform: (buff) => buff.toString(),
    timeout: 1000, // TIMEOUT less than 10 seconds
    inBetweenTimeout: false,
  });
  console.log("before sleep");

  await sleep(2000); // 10 seconds longer than TIMEOUT

  console.log("before for");
  for await (const chunk of iterator) {
    console.log(chunk.length);
  }
  console.log("after for");
}

main();
