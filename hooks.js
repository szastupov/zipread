var Archive = require("./archive.js");
var fs = require("fs");
var path = require("path");

var ZIP_CACHE = {};

function getZip(path) {
	path = znorm(path);
	var cached = ZIP_CACHE[path];
	if (cached) {
		return cached;
	}

	var zip = new ZipFS(path);
	ZIP_CACHE[path] = zip;

	return zip;
}

// We need it mostly for Windows
function znorm(str) {
	return str.replace(/\\/g, "/");
}

function zjoin(a, b) {
	return znorm(path.join(a, b));
}

function ZipFS(path) {
	this.path = path;
	this.zip = new Archive(path);
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

	readdirSync: function(dir) {
		return this.zip.readdir(dir);
	},

	realpathSync: function(path) {
		return zjoin(this.path, path);
	}
};

function wrapFS (name) {
	var orig = fs[name];
	fs[name] = function (path, arg1) {
		var idx = path.indexOf(".zip");
		if (idx == -1) {
			return orig.apply(fs, arguments);
		}
		
		var zipBase = path.substr(0, idx+4);
		var zipChild = path.substr(idx+5);
		var zip = getZip(zipBase);
		return zip[name](znorm(zipChild), arg1);
	};
}

// The minimum for most modules
wrapFS("readFileSync");
wrapFS("readdirSync");
wrapFS("statSync");
wrapFS("realpathSync");