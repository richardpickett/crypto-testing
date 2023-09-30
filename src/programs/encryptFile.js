import { parse } from "path";
import fs from "fs";
import { Codec } from "./../lib/codec.js";
import fileExists from "../lib/fileExists.js";
import logger from "../lib/logger.js";

export default function (program) {
  program
    .command("encryptFile")
    .requiredOption("-k, --key-file-prefix <prefix>", "The prefix to the recipient's key file")
    .requiredOption("-f, --file <fileName>", "The file you will encrypt")
    .option("-s, --signature-key <prefix>", "The prefix to your private key file for signature")
    .action(async (options) => {
      const { name } = parse(options.keyFilePrefix);
      const baseKeyFilePath = `keys/${name}`;
      const codec = new Codec();
      var signatureKeyPath = false;
      if (options.signatureKey) {
        signatureKeyPath = `keys/${parse(options.signatureKey).name}.priv`;
      }
      // load the key(s)
      return codec
        .loadKeyPair(baseKeyFilePath)
        .then(([publicKeyLoadResult, privateKeyLoadResult]) => {
          // if we have the key, check to make sure the plain-text file exists
          if (!publicKeyLoadResult) {
            throw new error(`${baseKeyFilePath} could not be loaded as a public key`);
          }
          return signatureKeyPath ? fileExists(signatureKeyPath) : false;
        })
        .then((exists) => {
          return exists ? codec.loadSigningKey(signatureKeyPath) : true;
        })
        .then(() => {
          return fileExists(options.file);
        })
        .then(async (exists) => {
          // if the file exists, read it in
          if (!exists) {
            throw new Error(`${options.file} does not exist`);
          }
          return new Promise((resolve, reject) => {
            fs.readFile(options.file, (err, data) => {
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
          return codec.encrypt(fileContents);
        })
        .then((encrypted) => {
          // save the encrypted data to <file name>.<name of key>
          return new Promise((resolve, reject) => {
            fs.writeFile(
              `${options.file}.${name}.${options.signatureKey ? options.signatureKey + "." : ""}json`,
              encrypted,
              "utf8",
              (err) => {
                if (err) {
                  logger.error("Couldn't Save Encrytped Data", err);
                  reject(err);
                } else {
                  logger.success("Saved Encrytped Data");
                  resolve(true);
                }
              }
            );
          });
        });
    });
}
