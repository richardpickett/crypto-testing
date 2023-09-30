import fs from "fs";
export default async function fileExists(path) {
  return new Promise((resolve, reject) => {
    fs.stat(path, (error, stats) => {
      resolve(!error);
    });
  });
}
