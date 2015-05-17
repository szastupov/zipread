var fs = require("fs");
var assert = require("assert");
var zlib = require('zlib');

// Store original fs funcitons
var openSync = fs.openSync;
var closeSync = fs.closeSync;
var statSync = fs.statSync;
var readSync = fs.readSync;

function Archive(path) {
    this.path = path;
    this.fd = openSync(path, "r");
    this.fileLen = statSync(path).size;
    this.files = {};

    var cd = this._getCD();
    var off = cd.offset;
    for (var i = 0; i < cd.records; i++) {
        off += this._readCDEntry(off);
    }
}

Archive.prototype = {
    close: function() {
        closeSync(this.fd);
    },

    readFileSync: function(fname) {
        var file = this.files[fname];

        var hdr = new Buffer(30);
        this._readSync(hdr, file.offset);
        assert.equal(hdr.readUIntLE(0, 4), 0x04034b50);

        var fnameLen = hdr.readUIntLE(26, 2);
        var extraLen = hdr.readUIntLE(28, 2);
        var dataOff = file.offset + hdr.length + fnameLen + extraLen;

        var cbuf = new Buffer(file.csize);
        var read = this._readSync(cbuf, dataOff);
        assert.equal(read, cbuf.length);

        if (file.method == 0) {
            return cbuf;
        } else if (file.method === 8) {
            var ubuf = zlib.inflateRawSync(cbuf);
            return ubuf;
        }
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

    _readSync: function(buf, position) {
        return readSync(this.fd, buf, 0, buf.length, position);
    },

    _readCDEntry: function(offset) {
        var cde = new Buffer(46);
        var read = this._readSync(cde, offset);
        assert.equal(read, cde.length);
        assert.equal(cde.readUIntLE(0, 4), 0x02014b50);

        var fnameLen = cde.readUIntLE(28, 2);
        var extraLen = cde.readUIntLE(30, 2);
        var commentLen = cde.readUIntLE(32, 2);

        var fname = new Buffer(fnameLen);
        this._readSync(fname, offset + cde.length);

        var file = {
            name: fname.toString(),
            method: cde.readUIntLE(10, 2),
            csize: cde.readUIntLE(20, 4),
            usize: cde.readUIntLE(24, 4),
            offset: cde.readUIntLE(42, 4)
        };
        file.dir = file.csize == 0;

        this.files[file.name] = file;

        return cde.length + fnameLen + extraLen + commentLen;
    },

    _getCD: function() {
        // Find EOCD
        var eocd = new Buffer(22);
        this._readSync(eocd, this.fileLen - eocd.length);
        assert.equal(eocd.readUIntLE(0, 4), 0x06054b50);

        return {
            records: eocd.readUIntLE(10, 2),
            size: eocd.readUIntLE(12, 4),
            offset: eocd.readUIntLE(16, 4)
        };
    }
};

module.exports = Archive;