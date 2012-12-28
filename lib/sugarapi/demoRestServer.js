/*********************************************************************************
 * The contents of this file are subject to the SugarCRM Master Subscription
 * Agreement (""License"") which can be viewed at
 * http://www.sugarcrm.com/crm/master-subscription-agreement
 * By installing or using this file, You have unconditionally agreed to the
 * terms and conditions of the License, and You may not use this file except in
 * compliance with the License.  Under the terms of the license, You shall not,
 * among other things: 1) sublicense, resell, rent, lease, redistribute, assign
 * or otherwise transfer Your rights to the Software, and 2) use the Software
 * for timesharing or service bureau purposes such as hosting the Software for
 * commercial gain and/or for the benefit of a third party.  Use of the Software
 * may be subject to applicable fees and any use of the Software without first
 * paying applicable fees is strictly prohibited.  You do not have the right to
 * remove SugarCRM copyrights from the source code or user interface.
 *
 * All copies of the Covered Code must include on each user interface screen:
 *  (i) the ""Powered by SugarCRM"" logo and
 *  (ii) the SugarCRM copyright notice
 * in the same form as they appear in the distribution.  See full license for
 * requirements.
 *
 * Your Warranty, Limitations of liability and Indemnity are expressly stated
 * in the License.  Please refer to the License for the specific language
 * governing these rights and limitations under the License.  Portions created
 * by SugarCRM are Copyright (C) 2004-2012 SugarCRM, Inc.; All Rights Reserved.
 ********************************************************************************/
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