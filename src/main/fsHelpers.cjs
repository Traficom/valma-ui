
const fs = require('fs');
const path = require('path');

const exists = (filePath) => fs.existsSync(filePath);
const join = (...parts) => path.join(...parts);
const readFileSync = (filePath, enc = 'utf8') =>
  fs.readFileSync(filePath, enc);
const readdirSync = (dirPath) => fs.readdirSync(dirPath);
const unlinkSync = (filePath) => fs.unlinkSync(filePath);

module.exports = {
  exists,
  join,
  readFileSync,
  readdirSync,
  unlinkSync,
};
