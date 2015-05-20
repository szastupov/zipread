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

zipread/hooks
-------------

**zipread** also provides a set of **fs** hooks to require node modules directly from ZIP.

Create a modules archive:
```shell
$ (cd node_modules && zip -r ../mods.zip *)
$ rm -r node_modules
```

Require a module explicitly:
```javascript
require("zipread/hooks"); // Install hooks
require("./mods.zip/request");	// Load 'request' from mods.zip
```

Or implicitly by setting **NODE_PATH**:
```shell
$ NODE_PATH=./mods.zip node ./yourapp.js
```

In this case, you still have to require the hook but the rest can be untouched:
```javascript
require("zipread/hooks");
require("request");
```

A good use case for this would be shipping desktop applications. 
For example, Windows doesn't like long paths and putting your huge node_modules
directory into a single archive should solve this problem.


[npm-image]: https://img.shields.io/npm/v/zipread.svg?style=flat
[npm-link]: https://npmjs.org/package/zipread
[travis-image]: https://img.shields.io/travis/szastupov/zipread.svg?style=flat
[travis-link]: https://travis-ci.org/szastupov/zipread
[appveyor-image]: https://img.shields.io/appveyor/ci/szastupov/zipread.svg?style=flat
[appveyor-link]: https://ci.appveyor.com/project/szastupov/zipread