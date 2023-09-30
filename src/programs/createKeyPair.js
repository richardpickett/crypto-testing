import { join, parse, basename } from "path";
import { Codec } from "./../lib/codec.js";

export default function (program) {
  program
    .command("createKeyPair")
    .requiredOption("-k, --key-file-prefix <prefix>", "The prefix to your key files")
    .requiredOption(
      "--modulus-length <modulus length",
      "Length of the key in bits (2,048+ recommended for strong security)",
      4096
    )
    .requiredOption("--public-key-type <key type>", "Public Key Type", "spki") // SubjectPublicKeyInfo (SPKI) format
    .requiredOption("--public-key-format <key format>", "Public Key Format", "pem") // Privacy Enhanced Mail (PEM) format
    .requiredOption("--private-key-type <key type>", "Private Key Type", "pkcs8") // Private Key in PKCS#8 format
    .requiredOption("--private-key-format <key format>", "Private Key Format", "pem") // Privacy Enhanced Mail (PEM) format
    .action(async (options) => {
      options.modulusLength = parseInt(options.modulusLength);
      const { name } = parse(options.keyFilePrefix);
      const baseKeyFilePath = `keys/${name}`;
      const codec = new Codec();
      return codec.createKeyPair(options).then(() => {
        return codec.saveKeyPair(baseKeyFilePath);
      });
    });
}
