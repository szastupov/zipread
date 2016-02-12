var Archive = require("../archive.js");
var fs = require("fs");
var assert = require("assert");
var async = require("async");

var testfiles = ["foo", "bar", "js/test.js", "empty"].map(function (f) {
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

    it ("should decompress files (sync)", function () {
        testfiles.forEach(function(f) {
            var orig = fs.readFileSync(__dirname + "/" + f);
            var res = zip.readFileSync(f);
            assert.deepEqual(orig, res);
        });
    });

    it ("also has async interface", function (done) {
        function compare(f, next) {
            var orig = fs.readFileSync(__dirname + "/" + f);

            zip.readFile(f, function (err, data) {
                assert.ifError(err);
                assert.deepEqual(orig, data);
                next();
            });
        }
        async.each(testfiles, compare, done);
    });

    it ("should properly identify directories", function () {
        assert(zip.files["testfiles/"].dir);
    });

    it ("should throw not exist error", function () {
        assert.throws(function () {
            zip.readFileSync("inexisting");
        }, /Path 'inexisting' not found/);
    });

    it ("should return not exist error", function () {
        zip.readFile("inexisting", function (err, data) {
            assert(err instanceof Error, "err should be Error");
        });
    });

    it ("should read directory contents", function () {
        var contents = zip.readdir("testfiles");
        assert.deepEqual(contents, ["bar", "empty", "foo", "js"]);
    });

});
