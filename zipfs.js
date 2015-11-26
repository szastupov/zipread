var Archive = require('./archive.js');

function ZipFS(path) {
  this.path = path;
  this.zip = new Archive(path);
  this._pkgCache = {};
}

ZipFS.prototype = {
  readFileSync: function(path, encoding) {
    return this.zip.readFileSync(path, encoding);
  },

  statSync: function(path) {
    if (!this.zip.exists(path)) {
      throw new Error(path+" doesn't exist");
    }
    var file = this.zip.files[path];
    
    return {
      isDirectory: function () {
        return file.dir;
      },
      isFile: function () {
        return !file.dir;
      }
    };
  },

  existsSync: function (path) {
    return this.zip.exists(path);
  },

  readdirSync: function(dir) {
    return this.zip.readdir(dir);
  },

  realpathSync: function(path) {
    return Archive.zjoin(this.path, path);
  }
};

module.exports = ZipFS;