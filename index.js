var Archive = require("./archive");

module.exports = function(path) {
  return new Archive(path);
};