import { Config } from "@richardpickett/config-js";
import fs from "fs";

var jsonData;
var packageJson;

try {
  jsonData = fs.readFileSync(filePath, "utf8");
  packageJson = JSON.parse(jsonData);
} catch (err) {
  packageJson = {};
}

const config = new Config({
  jsonVariables: [],
  packageJson,
});
export default config;
