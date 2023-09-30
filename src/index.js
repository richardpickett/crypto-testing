import { Command } from "commander";
import config from "./lib/config.js";
import createKeyPair from "./programs/createKeyPair.js";
import encryptFile from "./programs/encryptFile.js";
import decryptFile from "./programs/decryptFile.js";

const program = new Command();

program.name(config.name).description(config.description).version(config.version);

createKeyPair(program);
encryptFile(program);
decryptFile(program);

async function run() {
  return await program.parseAsync();
}

run();
