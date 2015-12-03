var fs = require("fs");
var path = require("path");
var assert = require("assert");
var zlib = require('zlib');

// Store original fs funcitons
var openSync = fs.openSync;
var closeSync = fs.closeSync;
var statSync = fs.statSync;
var readSync = fs.readSync;
var readAsync = fs.read;

var FH_SIZE = 30;
var FH_SIGN = 0x04034b50;
var EOCD_SIZE = 22;
var EOCD_SIGN = 0x06054b50;
var CDE_SIZE = 46;
var CDE_SIGN = 0x02014b50;

function Archive(path) {
    this.path = path;
    this.fd = openSync(path, "r");
    this.fileLen = statSync(path).size;
    this.files = {};

    this._loadCD();
}

// We need those mostly for Windows
Archive.znorm = function(str) {
    return str.replace(/\\/g, "/");
};

Archive.zjoin = function(a, b) {
    return this.znorm(path.join(a, b));
};

Archive.prototype = {
    close: function() {
        closeSync(this.fd);
    },

    exists: function(path) {
        return path in this.files;
    },

    readFileSync: function(fname, encoding) {
        var file = this.files[fname];
        if (!file) {
            throw new Error("Path '" + fname + "' not found");
        }
        
        var hdr = new Buffer(FH_SIZE);
        this._readSync(hdr, file.offset);
        
        var dataOff = this._getDataOffset(file, hdr);
        var cbuf = new Buffer(file.csize);
       
        var read = this._readSync(cbuf, dataOff);
        assert.equal(read, cbuf.length);

        var result;
        if (file.method === 0) {
            result = cbuf;
        } else if (file.method === 8) {
            result = zlib.inflateRawSync(cbuf);
        } else {
            throw Error("Unsupported compression method " + file.method);
        }

        return encoding ? result.toString(encoding) : result;
    },

    readFile: function(fname, callback) {
        var file = this.files[fname];
        if (!file) {
            return callback(Error("Path '" + fname + "' not found"));
        }

        var hdr = new Buffer(FH_SIZE);
        var self = this;

        this._readAsync(hdr, file.offset, function () {
            var dataOff = self._getDataOffset(file, hdr);
            var cbuf = new Buffer(file.csize);

            self._readAsync(cbuf, dataOff, function (err, read) {
                assert.equal(read, cbuf.length);

                if (file.method === 0) {
                    callback(null, cbuf);
                } else if (file.method === 8) {
                    zlib.inflateRaw(cbuf, callback);
                }
            });
        });
    },

    filter: function(pred) {
        var result = [];

        for (var f in this.files) {
            var file = this.files[f];
            if (pred(f, file)) {
                result.push(file);
            }
        }

        return result;
    },

    readdir: function(dir) {
        dir = Archive.zjoin(dir, "/");
        var filtered = this.filter(function (relativePath, file) {
            var ss = relativePath.indexOf("/", dir.length);
            return relativePath.indexOf(dir) === 0
                && relativePath !== dir
                && (ss === -1 || ss == relativePath.length-1);
        });
        var found = filtered.map(function (file) {
            return path.basename(file.name);
        });
        return found;
    },

    _getDataOffset: function(file, hdr) {
        assert.equal(hdr.readUIntLE(0, 4), FH_SIGN, "Couldn't find file signature");

        var fnameLen = hdr.readUIntLE(26, 2);
        var extraLen = hdr.readUIntLE(28, 2);
        var dataOff = file.offset + hdr.length + fnameLen + extraLen;

        return dataOff;
    },

    _readSync: function(buf, position) {
        return readSync(this.fd, buf, 0, buf.length, position);
    },

    _readAsync: function(buf, position, callback) {
        return readAsync(this.fd, buf, 0, buf.length, position, callback);
    },

    _readCDEntry: function(cdbuf, offset) {
        function field(pos, size) {
            return cdbuf.readUIntLE(offset + pos, size);
        }
        assert.equal(field(0, 4), CDE_SIGN, "Couldn't find CD signature");

        var fnameLen = field(28, 2);
        var fnamePos = offset + CDE_SIZE;
        var extraLen = field(30, 2);
        var commentLen = field(32, 2);

        var fname = cdbuf.toString(undefined, fnamePos, fnamePos + fnameLen);

        var file = {
            name: fname,
            method: field(10, 2),
            csize: field(20, 4),
            usize: field(24, 4),
            offset: field(42, 4)
        };
        file.dir = fname.substr(-1) == '/';

        this.files[file.name] = file;

        return CDE_SIZE + fnameLen + extraLen + commentLen;
    },

    _getCD: function() {
        // Find EOCD
        var eocd = new Buffer(EOCD_SIZE);
        this._readSync(eocd, this.fileLen - eocd.length);
        assert.equal(eocd.readUIntLE(0, 4), EOCD_SIGN, "Couldn't find EOCD signature");

        var size = eocd.readUIntLE(12, 4);
        var offset = eocd.readUIntLE(16, 4);
        var cdbuf = new Buffer(size);
        var read = this._readSync(cdbuf, offset);
        assert.equal(read, size);

        return {
            records: eocd.readUIntLE(10, 2),
            buf: cdbuf
        };
    },

    _loadCD: function() {
        var cd = this._getCD();
        var off = 0;
        for (var i = 0; i < cd.records; i++) {
            off += this._readCDEntry(cd.buf, off);
        }
    }
};

module.exports = Archive;