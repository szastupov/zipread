var hooks = require("../hooks.js")
var fs = require("fs");
var assert = require("assert");

var testfiles = ["foo", "bar"].map(function (f) {
    return "testfiles/" + f;
});

describe ("Hooks", function () {
    it ("readFileSync should read file from the archive", function () {
        testfiles.forEach(function(f) {
            var orig = fs.readFileSync(__dirname + "/" + f);
            var res = fs.readFileSync(__dirname + "/test.zip/" + f);
            assert.deepEqual(orig, res);
        });
    });

    it ("should require a single node module from the archive", function () {
        var foo = require(__dirname + "/test.zip/testfiles/js/test.js");
        assert.deepEqual(foo.foo, "Bar");
    });

    it ("should require a package from the archive", function () {
        var pkg = require(__dirname + "/test.zip/testfiles/js/pkg");
        assert.deepEqual(pkg, "Helper!");
    });
});