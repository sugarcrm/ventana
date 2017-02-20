
require('../src/client.js');

var SugarTest = {};

(function(test) {

    test.waitFlag = false;
    test.wait = function() { waitsFor(function() { return test.waitFlag; }); };
    test.resetWaitFlag = function() { this.waitFlag = false; };
    test.setWaitFlag = function() { this.waitFlag = true; };

}(SugarTest));

beforeEach(function(){
    SugarTest.resetWaitFlag();
});

window.SugarTest = SugarTest;

var testsContext = require.context('./', true, /client\.js/);
testsContext.keys().forEach(testsContext);
