
require('../src/client.js');

var testsContext = require.context('./', true, /client\.js/);
testsContext.keys().forEach(testsContext);
