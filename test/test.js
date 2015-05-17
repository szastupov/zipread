var Archive = require("../lib/archive.js");
var fs = require("fs");
var assert = require("assert");

var testfiles = fs.readdirSync(__dirname + "/testfiles").map(function (f) {
    return "testfiles/" + f;
});

describe ("Archive", function () {
    var zip;

    beforeEach(function () {
        zip = new Archive(__dirname + "/test.zip");
    });

    afterEach(function () {
        zip.close();
    });

    it ("should load archive", function () {
        testfiles.forEach(function(f) {
            assert(zip.files[f], f + " not found in archive");
        });
    });

    it ("should decompress files", function () {
        testfiles.forEach(function(f) {
            var orig = fs.readFileSync(__dirname + "/" + f);
            var res = zip.readFileSync(f);
            assert.deepEqual(orig, res);
        });
    });

    it ("should properly identify directories", function () {
        assert(zip.files["testfiles/"].dir);
    });

});
