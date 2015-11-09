'use strict';

const Fs = require('fire-fs');
const Path = require('fire-path');
const Async = require('async');

//
describe('Editor.Package', function () {
  const testPackages = Editor.url('editor-framework://test/fixtures/packages/');
  const spy = sinon.spy(Editor,'sendToWindows');

  before(function () {
    Editor.init({
      'package-search-path': [
        Editor.url('editor-framework://test/fixtures/packages/')
      ],
    });
  });

  after(function () {
    Editor.reset();
  });

  describe('fixtures/packages/simple', function () {
    const path = Path.join(testPackages,'simple');

    afterEach(function (done) {
      Editor.Package.unload(path, done);
    });

    it('should load simple package', function (done) {
      Editor.Package.load(path, done);
    });

    it('should unload simple package', function (done) {
      Async.series([
        next => { Editor.Package.load(path, next); },
        next => { Editor.Package.unload(path, next); },
      ],done);
    });
  });

  describe('fixtures/packages/simple ipc-message', function () {
    const path = Path.join(testPackages,'simple');

    assert.isTrue( Fs.existsSync(path) );

    const packageLoaded = spy.withArgs('package:loaded');
    const packageUnloaded = spy.withArgs('package:unloaded');

    beforeEach(function () {
      spy.reset();
    });

    it('should send loaded ipc message', function (done) {
      Editor.Package.load(path, function () {
        assert( packageLoaded.calledWith('package:loaded', 'simple') );
        done();
      });
    });

    it('should send unload message', function (done) {
      Async.series([
        next => { Editor.Package.load(path, next); },
        next => { Editor.Package.unload(path, next); },
      ], function () {
        assert( packageUnloaded.calledWith('package:unloaded', 'simple') );
        done();
      });
    });
  });

  describe('fixtures/packages/main-deps', function () {
    const path = Path.join(testPackages,'main-deps');

    afterEach(function (done) {
      Editor.Package.unload(path, done);
    });

    it('should unload main-deps package', function (done) {
      let cache = require.cache;
      let loadCacheList = [];
      Async.series([
        next => { Editor.Package.load(path, next); },
        next => {
          for ( var name in cache ) {
            loadCacheList.push(cache[name].filename);
          }
          next();
        },
        next => { Editor.Package.unload(path, next); },
        next => {
          var index;
          for (var name in cache) {
            index = loadCacheList.indexOf(cache[name].filename);
            loadCacheList.splice(index, 1);
          }

          // main.js | core/test.js
          expect(loadCacheList).to.eql([
            Path.join(path, 'main.js'),
            Path.join(path, 'core/test.js'),
            Path.join(path, 'core/foo/bar.js'),
            Path.join(path, 'test.js'),
          ]);

          next();
        },
      ], done);
    });
  });

  describe('fixtures/packages/package-json-broken', function () {
    const path = Path.join(testPackages,'package-json-broken');

    afterEach(function (done) {
      Editor.Package.unload(path, done);
    });

    it('should report error when package.json broken', function (done) {
      Editor.Package.load(path, err => {
        assert(err);
        done();
      });
    });
  });

  describe('fixtures/packages/host-not-exists', function () {
    const path = Path.join(testPackages,'host-not-exists');

    afterEach(function (done) {
      Editor.Package.unload(path, done);
    });

    it('should report error when hosts not exists', function (done) {
      Editor.Package.load(path, err => {
        assert(err);
        done();
      });
    });
  });

  describe('fixtures/packages/main-js-broken', function () {
    const path = Path.join(testPackages,'main-js-broken');

    afterEach(function (done) {
      Editor.Package.unload(path, done);
    });

    it('should report error when failed to load main.js', function (done) {
      Editor.Package.load(path, err => {
        assert(err);
        done();
      });
    });
  });

  describe('fixtures/packages/package-deps', function () {
    const path1 = Path.join(testPackages,'package-deps');
    const path2 = Path.join(testPackages,'dep-01');
    const path3 = Path.join(testPackages,'dep-02');

    const packageLoaded = spy.withArgs('package:loaded');

    beforeEach(function (done) {
      spy.reset();
      done();
    });

    afterEach(function (done) {
      Async.series([
        next => {
          Editor.Package.unload(path1, next);
        },
        next => {
          Editor.Package.unload(path2, next);
        },
        next => {
          Editor.Package.unload(path3, next);
        },
        next => {
          Editor.Package.removePath(testPackages);
          next();
        },
      ], done);
    });

    it('should load dependencies first', function (done) {
      Editor.Package.load(path1, () => {
        // console.log(packageLoaded.args);
        assert( packageLoaded.getCall(0).calledWith('package:loaded', 'dep-02') );
        assert( packageLoaded.getCall(1).calledWith('package:loaded', 'dep-01') );
        assert( packageLoaded.getCall(2).calledWith('package:loaded', 'package-deps') );

        done();
      });
    });
  });

  // it.skip('should build fixtures/packages/needs-build', function( done ) {
  // });

  // it.skip('should remove bin/dev when unload fixtures/packages/needs-build', function( done ) {
  // });
});
