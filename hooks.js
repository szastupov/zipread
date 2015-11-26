var Archive = require("./archive.js");
var ZipFS = require("./zipfs.js");

var fs = require("fs");
var path = require("path");
var Module = require('module');

var ZIP_CACHE = {};

function getZip(path) {
  path = Archive.znorm(path);
  var cached = ZIP_CACHE[path];
  if (cached) {
    return cached;
  }

  var zip = new ZipFS(path);
  ZIP_CACHE[path] = zip;

  return zip;
}

function parseZipPath(path) {
  var idx = path.indexOf(".zip");
  if (idx == -1) {
    return false;
  }
  
  return {
    zip: Archive.znorm(path.substr(0, idx+4)),
    entry: Archive.znorm(path.substr(idx+5))
  };
}

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

function readPackage(zip, entry) {
  if (hasOwnProperty(zip._pkgCache, entry)) {
    return zip._pkgCache[entry];
  }
  var jsonPath = Archive.zjoin(entry, 'package.json');
  var json;
  var pkg;

  try {
    json = zip.readFileSync(jsonPath, 'utf8');
  } catch (e) {
    return false;
  }

  try {
    pkg = zip._pkgCache[entry] = JSON.parse(json).main;
  } catch (e) {
    e.path = jsonPath;
    e.message ='Error parsing ' + jsonPath + ': ' + e.message;
    throw e;
  }

  return pkg;
}

function tryFile(zip, entry) {
  try {
    var stat = zip.statSync(entry);
    if (stat && !stat.isDirectory()) {
      return zip.realpathSync(entry, Module._realpathCache);
    }
  }
  catch (e) { /* ignore ENOENT exception */}

  return false;
}

function tryExtensions(zip, entry, exts) {
  for (var i = 0; i < exts.length; i++) {
    var filename = tryFile(zip, entry + exts[i]);
    if (filename) {
      return filename;
    }
  }
  return false;
}

function tryPackage(zip, entry, exts) {
  var pkg = readPackage(zip, entry);

  if (!pkg) return false;

  var filename = Archive.zjoin(entry, pkg);
  return tryFile(zip, filename) || tryExtensions(zip, filename, exts) ||
         tryExtensions(zip, Archive.zjoin(filename, 'index'), exts);
}

(function (flists) {
  flists.forEach(function (name) {
    var orig = fs[name];
    fs[name] = function (path, arg1) {
      var idx = path.indexOf(".zip");
      if (idx == -1) {
        return orig.apply(fs, arguments);
      }
      var zpath = parseZipPath(path);
      var zip = getZip(zpath.zip);
      return zip[name](Archive.znorm(zpath.entry), arg1);
    };
  });
})([
  'readFileSync',
  'readdirSync',
  'statSync',
  'realpathSync',
  'existsSync'
]);

(function () {
  var orig = Module._findPath;
  Module._findPath = function _zipModuleFindPath(request, paths) {
    var result = orig.apply(module, arguments);
    if (result)
      return result;

    var exts = Object.keys(Module._extensions);

    if (request.charAt(0) === '/') {
      paths = [''];
    }

    var trailingSlash = (request.slice(-1) === '/');

    var cacheKey = JSON.stringify({request: request, paths: paths});
    if (Module._pathCache[cacheKey]) {
      return Module._pathCache[cacheKey];
    }

    for (var i = 0, PL = paths.length; i < PL; i++) {
      var basePath = path.resolve(paths[i], request);
      var zpath = parseZipPath(basePath);
      if (!zpath)
        continue;
      var zip = getZip(zpath.zip);

      if (!trailingSlash) {
        filename = tryFile(zip, zpath.entry);

        if (!filename)
          filename = tryExtensions(zip, zpath.entry, exts);
      }

      if (!filename)
        filename = tryPackage(zip, zpath.entry, exts);

      if (!filename) {
        filename = tryExtensions(zip, Archive.zjoin(zpath.entry, 'index'), exts);
      }

      if (filename) {
        Module._pathCache[cacheKey] = filename;
        return filename;
      }
    }
    return false;
  }
})();