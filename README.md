zipread
=======

[![NPM version][npm-image]][npm-link]
[![Build status][travis-image]][travis-link]
[![Build status][appveyor-image]][appveyor-link]

**zipread** is a ZIP file reader designed for speed and memory efficiency. Unlike other modules, it doesn't read the whole file into memory and uses native ZLIB functions for decompression.

```javascript
var zipread = require("zipread");
var zip = zipread("file.zip");

var contents = zip.readFileSync("some_file.txt").toString();

// Or for async version:
zip.readFile("some_file.txt", function (err, buf) {
	contents = buf.toString();
});

```

[npm-image]: https://img.shields.io/npm/v/zipread.svg?style=flat
[npm-link]: https://npmjs.org/package/zipread
[travis-image]: https://img.shields.io/travis/szastupov/zipread.svg?style=flat
[travis-link]: https://travis-ci.org/szastupov/zipread
[appveyor-image]: https://img.shields.io/appveyor/ci/szastupov/zipread.svg?style=flat
[appveyor-link]: https://ci.appveyor.com/project/szastupov/zipread