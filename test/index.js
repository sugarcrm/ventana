
require('../src/client.js');

var SugarTest = {};

(function(test) {

    test.storage = {};
    test.keyValueStore = {
        set: function(key, value) {
            test.storage[key] = value;
        },
        add: function(key, value) {
            test.storage[key] += value;
        },
        get: function(key) {
            return test.storage[key];
        },
        has: function(key) {
            return test.storage[key] ? true : false;
        },
        cut: function(key) {
            delete test.storage[key];
        },
        cutAll: function() {
            test.storage = {};
        },
        getAll: function() {
            return test.storage;
        }
    };

    test.seedFakeServer = function() {
        SugarTest.server = sinon.fakeServer.create();
    };

    test.waitFlag = false;
    test.wait = function() { waitsFor(function() { return test.waitFlag; }); };
    test.resetWaitFlag = function() { this.waitFlag = false; };
    test.setWaitFlag = function() { this.waitFlag = true; };
    test.dispose = function() {
        if (this.server && this.server.restore) this.server.restore();
    };

}(SugarTest));

beforeEach(function(){
    SugarTest.storage = {};
    SugarTest.resetWaitFlag();
});

afterEach(function() {
    SugarTest.dispose();
});

/**
 * Data provider code.
 *
 * @see https://github.com/jphpsf/jasmine-data-provider
 */
function using(name, values, func) {
    for (var i = 0, count = values.length; i < count; i++) {
        if (Object.prototype.toString.call(values[i]) !== '[object Array]') {
            values[i] = [values[i]];
        }
        func.apply(this, values[i]);
        jasmine.currentEnv_.currentSpec.description += ' (with "' + name + '" using ' + values[i].join(', ') + ')';
    }
}

window.SugarTest = SugarTest;
window.using = using;

let fixtures = {};

let metadata = require('./fixtures/metadata.js');
fixtures.metadata = metadata.metadata;
window.fixtures = fixtures;

var testsContext = require.context('./', true, /client\.js/);
testsContext.keys().forEach(testsContext);
