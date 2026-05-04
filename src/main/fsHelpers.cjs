
const fs = require('fs');
const path = require('path');

const exists = (filePath) => fs.existsSync(filePath);
const join = (a, b) => path.join(a, b);
const readFileSync = (filePath, enc = 'utf8') => fs.readFileSync(filePath, enc);
const readdirSync = (dirPath) => fs.readdirSync(dirPath);
const unlinkSync = (filePath) => fs.unlinkSync(filePath);
const renameSync = (oldPath, newPath) => fs.renameSync(oldPath, newPath);
const writeFileSync = (file, data) => fs.writeFileSync(file, data,  "utf8");

module.exports = {
  exists,
  join,
  readFileSync,
  readdirSync,
  unlinkSync,
  renameSync,
  writeFileSync
};
