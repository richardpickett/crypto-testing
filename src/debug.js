import { Command } from "commander";
import config from "./lib/config.js";
import createKeyPair from "./programs/createKeyPair.js";
import encryptFile from "./programs/encryptFile.js";

const program = new Command();

program.name(config.name).description(config.description).version(config.version);

createKeyPair(program);
encryptFile(program);

async function run() {
  //   await program.parseAsync(["node", "src/index.js", "createKeyPair", "-f", "richardPickett"]);
  return await program.parseAsync([
    "node",
    "src/index.js",
    "encryptFile",
    "-k",
    "richardPickett",
    "-s",
    "testyTestor",
    "-f",
    "texts/lorum_ipsum.txt",
  ]);
}

run();
