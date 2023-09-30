import { parse } from "path";
import fs from "fs";
import { Codec } from "./../lib/codec.js";
import fileExists from "../lib/fileExists.js";

export default function (program) {
  program
    .command("decryptFile")
    .requiredOption("-k, --key-file-prefix <prefix>", "The prefix to your privage key file")
    .requiredOption("-f, --file <fileName>", "The file you will decrypt")
    .action(async (options) => {
      const { name } = parse(options.keyFilePrefix);
      const baseKeyFilePath = `keys/${name}`;
      const codec = new Codec();
      // load the key(s)
      return codec
        .loadKeyPair(baseKeyFilePath)
        .then(([publicKeyLoadResult, privateKeyLoadResult]) => {
          // if we have the key, check to make sure the encrypted file
          if (!privateKeyLoadResult) {
            throw new error(`${baseKeyFilePath} could not be loaded as a public key`);
          }
          return fileExists(`${options.file}`);
        })
        .then(async (exists) => {
          // if the file exists, read it in
          if (!exists) {
            throw new Error(`${options.file} does not exist`);
          }
          return new Promise((resolve, reject) => {
            fs.readFile(`${options.file}`, (err, data) => {
              if (err) {
                reject(err);
              } else {
                resolve(data);
              }
            });
          });
        })
        .then((fileContents) => {
          // encrypt the plain text
          return codec.decrypt(fileContents);
        })
        .then((decrypted) => {
          return console.log(decrypted);
        });
    });
}
