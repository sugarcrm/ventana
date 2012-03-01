/**
 * Created by JetBrains PhpStorm.
 * User: dtam
 * Date: 2/16/12
 * Time: 11:05 AM
 * This file initiates a sinon fake server which overloads the xhttp method on the browser and returns json data
 * which corresponds to routes stored in SUGAR.restDemoData.
 */
var SUGAR = SUGAR || {};

SUGAR.demoRestServer = function() {
    var requestIdx;
    var requestObj;

    if(!sinon || !sinon.fakeServer) {
        console.log("you need sinon");
        return
    }
    console.log("starting sinon fakeserver");
    var fakeServer =sinon.fakeServer.create();

    if(!SUGAR.restDemoData && SUGAR.restDemoData.length > 0) {
        console.log("no routes found");
        return;
    }
    console.log("registering routes");
    for (requestIdx in  SUGAR.restDemoData) {
        requestObj = SUGAR.restDemoData[requestIdx];
        fakeServer.respondWith(requestObj.httpMethod, requestObj.route,
            [200, {  "Content-Type":"application/json"},
                JSON.stringify(requestObj.data)]);
    }

    return fakeServer;

};