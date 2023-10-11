import aes256 from "aes256";
import fs from "fs";
import crypto from "crypto";
import { parse } from "path";
import fileExists from "./fileExists.js";
import logger from "./logger.js";

export class Codec {
  constructor() {
    this.publicKey = false;
    this.privateKey = false;
    this.signingKey = false;
    this.signingKeyFile = false;
  }

  async createKeyPair(
    options = {
      modulusLength: 4096, // Length of the key in bits (recommended for strong security)
      publicKeyEncoding: {
        type: "spki", // SubjectPublicKeyInfo (SPKI) format
        format: "pem", // Privacy Enhanced Mail (PEM) format
      },
      privateKeyEncoding: {
        type: "pkcs8", // Private Key in PKCS#8 format
        format: "pem", // Privacy Enhanced Mail (PEM) format
      },
    }
  ) {
    const self = this;
    return new Promise((resolve, reject) => {
      crypto.generateKeyPair("rsa", options, (err, publicKey, privateKey) => {
        if (err) {
          reject(err);
          return;
        } else {
          self.publicKey = publicKey;
          self.privateKey = privateKey;
          logger.trace("Created Key Pair");
          resolve(true);
        }
      });
    });
  }

  async saveKeyPair(fileBaseName) {
    const promises = [
      new Promise((resolve, reject) => {
        fs.writeFile(
          `${fileBaseName}.pub`,
          this.publicKey.export({ format: "pem", type: "spki" }).toString(),
          "utf8",
          (err) => {
            if (err) {
              logger.error("Failed To Save Public Key");
              reject(err);
            } else {
              logger.trace("Saved Public Key");
              resolve(true);
            }
          }
        );
      }),
      new Promise((resolve, reject) => {
        fs.writeFile(
          `${fileBaseName}.priv`,
          this.privateKey.export({ format: "pem", type: "pkcs8" }).toString(),
          "utf8",
          (err) => {
            if (err) {
              logger.error("Failed To Save Private Key");
              reject(err);
            } else {
              logger.trace("Saved Private Key");
              resolve(true);
            }
          }
        );
      }),
    ];
    return Promise.all(promises);
  }

  async loadKeyPair(fileBaseName) {
    const promises = [
      fileExists(`${fileBaseName}.pub`).then((exists) => {
        if (!exists) {
          this.publicKey = false;
          return true;
        }
        return new Promise((resolve, reject) => {
          fs.readFile(`${fileBaseName}.pub`, (err, data) => {
            if (err) {
              logger.error("Failed To Load Public Key");
              reject(err);
            } else {
              this.publicKey = crypto.createPublicKey(data);
              logger.trace("Loaded Public Key");
              resolve(true);
            }
          });
        });
      }),
      fileExists(`${fileBaseName}.priv`).then((exists) => {
        if (!exists) {
          this.privateKey = false;
          return true;
        }
        return new Promise((resolve, reject) => {
          fs.readFile(`${fileBaseName}.priv`, (err, data) => {
            if (err) {
              logger.error("Failed To Load Private Key");
              reject(err);
            } else {
              this.privateKey = crypto.createPrivateKey(data);
              logger.trace("Loaded Private Key");
              resolve(true);
            }
          });
        });
      }),
    ];
    return Promise.all(promises);
  }

  async loadSigningKey(signingKeyFile) {
    return fileExists(`${signingKeyFile}`).then((exists) => {
      if (!exists) {
        this.signingKey = false;
        return true;
      }
      return new Promise((resolve, reject) => {
        fs.readFile(`${signingKeyFile}`, (err, data) => {
          if (err) {
            logger.error("Failed To Load Signing Private Key");
            reject(err);
          } else {
            this.signingKey = crypto.createPrivateKey(data);
            this.signingKeyFile = signingKeyFile;
            logger.trace("Loaded Signing Private Key");
            resolve(true);
          }
        });
      });
    });
  }

  async encrypt(buffer) {
    if (!this.publicKey) {
      throw new Error("You have to load a public key before you can encrypt");
    }
    var rtn = {};
    /* we create a random key, encrypt the data with this random key, then encrypt the random key with the public key */
    // random key
    const aesKey = crypto.randomBytes(32);
    // create the cipher and initialize with mode and IV (in real life you'll change this regularly)
    const cipher = crypto.createCipheriv("aes-256-cbc", aesKey, Buffer.alloc(16, 0)); // Use the appropriate mode and IV
    // now encrypt the data with the random aes key
    rtn.encryptedData = cipher.update(buffer, "utf8", "base64") + cipher.final("base64");
    // encrypt the random key with the public (recipient's) key
    rtn.encryptedKey = crypto.publicEncrypt(this.publicKey, aesKey).toString("base64");
    logger.success("Encrypted Data");
    if (this.signingKey) {
      const sign = crypto.createSign("SHA256");
      sign.update(rtn.encryptedKey);
      rtn.signature = sign.sign(this.signingKey, "base64");
      const { name } = parse(this.signingKeyFile);
      rtn.signatory = name;
      logger.success("Signed Key");
    }
    return JSON.stringify(rtn);
  }

  async decrypt(buffer) {
    if (!this.privateKey) {
      throw new Error("You have to load a private key before you can decrypt");
    }

    var json = false;

    try {
      json = JSON.parse(buffer);
    } catch (err) {
      logger.error("Unexpected Data Format", err);
      throw err;
    }

    if (json.signature && json.signatory) {
      logger.trace("Validating Signature");
      const valid = await this.validateSignature(json);
      if (!valid) {
        logger.error("Invalid Signature");
        throw new Error("Invalid Signature");
      }
      logger.success("Validated Signature");
    }

    // decrypt the aesKey using our private key
    const aesKey = crypto.privateDecrypt(this.privateKey, Buffer.from(json.encryptedKey, "base64"));
    // decrypt the data with the random aes key
    const decipher = crypto.createDecipheriv("aes-256-cbc", aesKey, Buffer.alloc(16, 0)); // Use the same mode and IV
    // return the decrypted data
    return decipher.update(json.encryptedData, "base64", "utf8") + decipher.final("utf8");
  }

  async validateSignature(json) {
    // if the signatory public key exists, it reads it and validates the signature

    return fileExists(`keys/${json.signatory}.pub`)
      .then((exists) => {
        if (!exists) {
          logger.error("Signature File Does Not Exist");
          throw new Error(`keys/${json.signatory}.pub file does not exist, can't verify signature`);
        }
        return new Promise((resolve, reject) => {
          fs.readFile(`keys/${json.signatory}.pub`, (err, data) => {
            if (err) {
              logger.error("Signature File Could Not Be Loaded");
              reject(err);
            } else {
              logger.trace("Loaded Signature File");
              resolve(data);
            }
          });
        });
      })
      .then((data) => {
        // create the key from file data
        const signingKey = crypto.createPublicKey(data);

        // create the verification object
        const verify = crypto.createVerify("SHA256");
        verify.update(json.encryptedKey);

        // Verify the signature
        return verify.verify(signingKey, json.signature, "base64");
      });
  }
}
