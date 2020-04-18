import { createReadStream } from "fs";
import forEmitOf from "../src/index";
import { join } from "path";

async function main() {
  const readStream = createReadStream(join(__dirname, "../package.json"));

  const iterator = forEmitOf(readStream, {
    transform: (buff) => buff.toString(),
  });

  for await (const chunk of iterator) {
    console.log(chunk);
  }
}

main();
