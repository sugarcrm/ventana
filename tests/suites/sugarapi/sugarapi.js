describe('SugarCRM Javascript API', function () {

    beforeEach(function () {
        this.validUsername = "admin";
        this.validPassword = "asdf";
        this.invalidUserName = "invalid";
        this.invalidPassword = "invalid";
        //instantiating API Instance
        this.api = SUGAR.Api.getInstance({baseUrl:"/rest/v10"});
        //get fresh fixtures
        this.fixtures = fixtures.api;
        this.fixtures.sugarFields = fixtures.metadata.sugarFields;
        //create fakeserver to make requests
        this.server = sinon.fakeServer.create();
        this.callbacks = {
            success:function (data) {
                //console.log("sucess callback");
                //console.log("data");
                //console.log(data);
            },
            error:function (data) {
                //console.log("error callback");
            }
        };
    });

    afterEach(function () {
        if (this.server.restore) this.server.restore();
        if (this.callbacks.success.restore) this.callbacks.success.restore();
        if (this.api.call.restore) this.api.call.restore();
        if (jQuery.ajax.restore) jQuery.ajax.restore();
    });


    it('should return an api instance', function () {
        expect(typeof(this.api)).toBe('object');
        expect(this.api.baseUrl).toEqual('/rest/v10');
    });

    describe('requestHandler', function () {
        it('should make a request with the correct request url', function () {
            // Spy on jQuery's ajax method
            var spy = sinon.spy(jQuery, 'ajax');

            //@arguments: method, URL, options
            this.api.call('read', '/rest/v10/contact');

            // Spy was called
            expect(spy).toHaveBeenCalled();

            // Check url property of first argument
            expect(spy.getCall(0).args[0].url)
                .toEqual("/rest/v10/contact");
        });

        it('should set the right method on request', function () {
            // Spy on jQuery's ajax method
            var spy = sinon.spy(jQuery, 'ajax');

            //@arguments: method, URL, options
            this.api.call('update', '/rest/v10/contacts');

            // Spy was called
            expect(spy).toHaveBeenCalled();

            // Check url property of first argument
            expect(spy.getCall(0).args[0].type)
                .toEqual("PUT");
        });

        it('should set the right options on request', function () {
            // Spy on jQuery's ajax method
            var spy = sinon.spy(jQuery, 'ajax');

            //@arguments: method, URL, options
            this.api.call('read', '/rest/v10/contacts', null, null, {async:true});

            // Spy was called
            expect(spy).toHaveBeenCalled();

            // Check url property of first argument
            expect(spy.getCall(0).args[0].async).toBeTruthy();
        });

        it('should handle successful responses', function () {

            this.server.respondWith("GET", "/rest/v10/contacts/1234",
                [200, {  "Content-Type":"application/json"},
                    JSON.stringify(this.fixtures["rest/v10/contact"].GET.response[1])]);

            var result = this.api.call('read', '/rest/v10/contacts/1234', null, null, this.callbacks);
            this.server.respond(); //tell server to respond to pending async call

            expect(result.responseText).toEqual(JSON.stringify(this.fixtures["rest/v10/contact"].GET.response[1]));
        });

        it('should fire error callbacks and return requests objects on error', function () {

            this.server.respondWith("GET", "rest/v10/contacts/123",
                [fixtures.api.responseErrors.fourhundred.code, { "Content-Type":"application/json" },
                    this.fixtures.responseErrors.fourhundred.body]);
            var result = this.api.call('read', 'rest/v10/contacts/123', null, null, this.callbacks);

            this.server.respond(); //tell server to respond to pending async call

            expect(result.responseText).toEqual(this.fixtures.responseErrors.fourhundred.body);
        });
    });


    describe('urlBuilder', function () {
        it('should build resource URLs for resources without ids', function () {
            var url = this.api.buildURL("contacts", "create");
            expect(url).toEqual('/rest/v10/contacts');
        });

        it('should build resource URLs for resources without ids if id exists in attributes', function () {
            var attributes = { id: "1" };
            var url = this.api.buildURL("contacts", "create", attributes);

            expect(url).toEqual('/rest/v10/contacts');
        });

        it('should build resource URLs for resources with ID and standard actions', function () {
            var attributes = { id:'1234' };
            var url = this.api.buildURL("contacts", "update", attributes);

            expect(url).toEqual('/rest/v10/contacts/1234');
        });

        it('should build resource URLs for resources with standard actions', function () {
            var module = "Contacts";
            var action = "";
            var attributes = { id:'1234' };
            var url = this.api.buildURL(module, action, attributes);

            expect(url).toEqual('/rest/v10/Contacts/1234');
        });

        it('should build resource URLs for resources with custom actions', function () {
            var module = "Contacts";
            var action = "customAction";
            var attributes = { id:'1234' };
            var url = this.api.buildURL("contacts", "customAction", attributes);

            expect(url).toEqual('/rest/v10/contacts/1234/customAction');
        });

        it('should build resource URLs for resources with link and related id', function () {
            var attributes = {
                id:'1234',
                relatedId: '4567'
            };
            var url = this.api.buildURL("contacts", "opportunities", attributes);

            expect(url).toEqual('/rest/v10/contacts/1234/opportunities/4567');
        });


        it('should build resource URLs for resources with custom params', function () {
            var params = {
                "fields": "first_name,last_name",
                "timestamp": "NOW",
                "funky_param": "hello world/%"
            };

            var attributes = { id:'1234'};
            var url = this.api.buildURL("contacts", "update", attributes, params);
            expect(url).toEqual('/rest/v10/contacts/1234?fields=first_name%2Clast_name&timestamp=NOW&funky_param=hello%20world%2F%25');
        });
    });

    describe('Bean CRUD actions', function () {

        it('search a module', function () {
            var spy = sinon.spy(this.callbacks, 'success');
            var module = "Contacts";
            var query = "bob";
            var fields = "first_name,last_name";

            this.server.respondWith("GET", "/rest/v10/Contacts/search?q=bob&fields=first_name%2Clast_name",
                [200, {  "Content-Type":"application/json"},
                    JSON.stringify(this.fixtures["rest/v10/contact"].GET.response[1])]);

            this.api.search(module, query, fields, this.callbacks);

            this.server.respond(); //tell server to respond to pending async call

            // expect success callback to have been called with the data from the response
            expect(spy).toHaveBeenCalledOnce();
            expect(spy).toHaveBeenCalledWith(this.fixtures["rest/v10/contact"].GET.response[1]);
        });
        it('should get a bean', function () {
            var spy = sinon.spy(this.callbacks, 'success');
            var module = "Contacts";
            var params = "";
            var attributes = {id:"1234"};

            this.server.respondWith("GET", "/rest/v10/Contacts/1234",
                [200, {  "Content-Type":"application/json"},
                    JSON.stringify(this.fixtures["rest/v10/contact"].GET.response[1])]);

            this.api.beans("read", module, attributes, params, this.callbacks);

            this.server.respond(); //tell server to respond to pending async call
            expect(spy.getCall(0).args[0]).toEqual(this.fixtures["rest/v10/contact"].GET.response[1]);
        });

        it('should create bean', function () {
            var spy = sinon.spy(this.callbacks, 'success');
            var module = "Contacts";
            var params = "";
            var attributes = {first_name:"Ronald", last_name:"McDonald", phone_work:"0980987", description:"This dude is cool."};

            this.server.respondWith("POST", "/rest/v10/Contacts",
                [200, {  "Content-Type":"application/json"},
                    JSON.stringify(this.fixtures["rest/v10/contact"].POST.response)]);

            this.api.beans("create", module, attributes, params, this.callbacks);

            this.server.respond(); //tell server to respond to pending async call
            expect(spy.getCall(0).args[0]).toEqual(this.fixtures["rest/v10/contact"].POST.response);
        });


        it('should get beans', function () {
            var spy = sinon.spy(this.callbacks, 'success');
            var module = "Contacts";
            var params = "";
            var attributes = {};

            this.server.respondWith("GET", "/rest/v10/Contacts",
                [200, {  "Content-Type":"application/json"},
                    JSON.stringify(this.fixtures["rest/v10/contact"].GET.response)]);

            this.api.beans("read", module, attributes, params, this.callbacks);

            this.server.respond(); //tell server to respond to pending async call
            expect(spy.getCall(0).args[0]).toEqual(this.fixtures["rest/v10/contact"].GET.response);
        });

        it('should update bean', function () {
            var module = "Contacts";
            var params = "";
            var attributes = {first_name:"Ronald", last_name:"McDonald", phone_work:"1234123", description:"This dude is cool."};
            var spy = sinon.spy(this.callbacks, 'success');

            this.server.respondWith("PUT", "/rest/v10/Contacts",
                [200, {  "Content-Type":"application/json"},
                    ""]);

            this.api.beans("update", module, attributes, params, this.callbacks);

            this.server.respond(); //tell server to respond to pending async call
            expect(spy.getCall(0).args[0]).toEqual(null);
            expect(spy.getCall(0).args[2].status).toEqual(200);
            expect(spy.getCall(0).args[2].responseText).toEqual("");
        });

        it('should delete bean', function () {
            var spy1 = sinon.spy(this.callbacks, 'error');
            var spy = sinon.spy(this.callbacks, 'success');
            var module = "Contacts";
            var params = "";
            var attributes = {id:"1234"};

            this.server.respondWith("DELETE", "/rest/v10/Contacts/1234",
                [200, {  "Content-Type":"application/json"}, ""]);

            this.api.beans("delete", module, attributes, params, this.callbacks);

            this.server.respond(); //tell server to respond to pending async call
            expect(spy.getCall(0).args[0]).toEqual(null);
            expect(spy.getCall(0).args[2].status).toEqual(200);
            expect(spy.getCall(0).args[2].responseText).toEqual("");
        });

    });

    describe('Relationship CRUD actions', function () {

        it('should fetch relationships', function () {
            var spy = sinon.spy(this.callbacks, 'success');
            var module = "opportunities";
            var attributes = {
                id: "1",
                link: "contacts"
            };

            this.server.respondWith("GET", "/rest/v10/opportunities/1/contacts",
                [200, {  "Content-Type":"application/json"},
                    JSON.stringify(this.fixtures["rest/v10/opportunities/1/contacts"].GET.response)]);

            this.api.relationships("read", module, attributes, null, this.callbacks);

            this.server.respond();
            expect(spy.getCall(0).args[0]).toEqual(this.fixtures["rest/v10/opportunities/1/contacts"].GET.response);

        });


        it('should create a relationship', function () {
            var fixture = this.fixtures["rest/v10/opportunities/1/contacts"];
            var spy = sinon.spy(this.callbacks, 'success');
            var module = "opportunities";
            var attributes = {
                id: '1',
                link: "contacts",
                related: {
                    first_name: "Ronald",
                    last_name: "McDonald",
                    opportunity_role: "Influencer"
                }
            };

            this.server.respondWith("POST", "/rest/v10/opportunities/1/contacts",
                [200, {  "Content-Type":"application/json"},
                    JSON.stringify(fixture.POST.response)]);

            this.api.relationships("create", module, attributes, null, this.callbacks);

            this.server.respond();
            expect(this.server.requests[0].requestBody).toEqual(fixture.POST.request);
            expect(spy.getCall(0).args[0]).toEqual(fixture.POST.response);
        });


        it('should update a relationship', function () {
            var fixture = this.fixtures["rest/v10/opportunities/1/contacts"];
            var module = "opportunities";
            var spy = sinon.spy(this.callbacks, 'success');

            var attributes = {
                id: '1',
                link: "contacts",
                relatedId: "2",
                related: {
                    opportunity_role: "Primary Decision Maker"
                }
            };

            this.server.respondWith("PUT", "/rest/v10/opportunities/1/contacts/2",
                [200, {  "Content-Type":"application/json"}, JSON.stringify(fixture.PUT.response)]);

            this.api.relationships("update", module, attributes, null, this.callbacks);

            this.server.respond();
            expect(this.server.requests[0].requestBody).toEqual(fixture.PUT.request);
            expect(spy.getCall(0).args[0]).toEqual(fixture.PUT.response);
        });

        it('should delete a relationship', function () {
            var fixture = this.fixtures["rest/v10/opportunities/1/contacts"];
            var module = "opportunities";
            var spy = sinon.spy(this.callbacks, 'success');

            var attributes = {
                id: '1',
                link: "contacts",
                relatedId: "2"
            };

            this.server.respondWith("DELETE", "/rest/v10/opportunities/1/contacts/2",
                [200, {  "Content-Type":"application/json"}, JSON.stringify(fixture.DELETE.response)]);

            this.api.relationships("delete", module, attributes, null, this.callbacks);

            this.server.respond();
            expect(this.server.requests[0].requestBody).toBeNull();
            expect(spy.getCall(0).args[0]).toEqual(fixture.DELETE.response);
        });

    });

    describe('sugar actions', function () {

        it('should retrieve metadata', function () {
            var types = [];
            var modules = ["Contacts"];
            var callspy = sinon.spy(this.api, 'call');
            var ajaxspy = sinon.spy($, 'ajax');
            var spy = sinon.spy(this.callbacks, 'success');
            //this.api.debug=true;
            this.server.respondWith("GET", "/rest/v10/metadata?type=&filter=Contacts",
                [200, {  "Content-Type":"application/json"},
                    JSON.stringify(fixtures.metadata.modules.Contacts)]);

            this.api.getMetadata(types, modules, this.callbacks);

            this.server.respond(); //tell server to respond to pending async call
            expect(spy.getCall(0).args[0]).toEqual(fixtures.metadata.modules.Contacts);
            expect(callspy.getCall(0).args[1]).toEqual("/rest/v10/metadata?type=&filter=Contacts");
            expect(ajaxspy).toHaveBeenCalledOnce();
        });

        it('should retrieve sugarFields', function () {
            var callspy = sinon.spy(this.api, 'call');
            var ajaxspy = sinon.spy($, 'ajax');
            var spy = sinon.spy(this.callbacks, 'success');
            var hash = "asdf";

            this.server.respondWith("GET", "/rest/v10/sugarFields?md5=asdf",
                [200, {  "Content-Type":"application/json"},
                    JSON.stringify(this.fixtures.sugarFields)]);

            this.api.getSugarFields(hash, this.callbacks);

            this.server.respond(); //tell server to respond to pending async call
            expect(spy.getCall(0).args[0]).toEqual(this.fixtures.sugarFields);
            expect(callspy.getCall(0).args[1]).toEqual("/rest/v10/sugarFields?md5=asdf");
            expect(ajaxspy).toHaveBeenCalledOnce();
        });

        it('should login users with correct credentials', function () {
            var callspy = sinon.spy(this.api, 'call');
            var ajaxspy = sinon.spy($, 'ajax');
            var spy = sinon.spy(this.callbacks, 'success');
            var extraInfo = {
                "type":"text",
                "client-info":{
                    "uuid":"xyz",
                    "model":"iPhone3,1",
                    "osVersion":"5.0.1",
                    "carrier":"att",
                    "appVersion":"SugarMobile 1.0",
                    "ismobile":true
                }
            };

            this.server.respondWith("POST", "/rest/v10/login",
                [200, {  "Content-Type":"application/json"},
                    JSON.stringify(this.fixtures["rest/v10/login"].POST.response)]);

            this.api.login(this.validUsername, this.validPassword, extraInfo, this.callbacks);
            this.server.respond(); //tell server to respond to pending async call

            expect(spy.getCall(0).args[0]).toEqual(this.fixtures["rest/v10/login"].POST.response);
            expect(callspy.getCall(0).args[1]).toEqual("/rest/v10/login");
            expect(ajaxspy).toHaveBeenCalledOnce();
            expect(this.api.isAuthenticated()).toBeTruthy();
        });

        it('should not login users with incorrect credentials', function () {
            var callspy = sinon.spy(this.api, 'call');
            var ajaxspy = sinon.spy($, 'ajax');
            var spy = sinon.spy(this.callbacks, 'error');
            var extraInfo = {
                "type":"text",
                "client-info":{
                    "uuid":"xyz",
                    "model":"iPhone3,1",
                    "osVersion":"5.0.1",
                    "carrier":"att",
                    "appVersion":"SugarMobile 1.0",
                    "ismobile":true
                }
            };

            this.server.respondWith("POST", "/rest/v10/login",
                [500, {  "Content-Type":"application/json"},
                    ""]);

            this.api.login(this.invalidUsername, this.invalidPassword, extraInfo, this.callbacks);

            this.server.respond(); //tell server to respond to pending async call

            expect(spy.getCall(0).args[0].status).toEqual(500);
            expect(spy.getCall(0).args[0].responseText).toEqual("");
            expect(callspy.getCall(0).args[1]).toEqual("/rest/v10/login");
            expect(ajaxspy).toHaveBeenCalledOnce();
        });

        it('should check if user is authenticated', function () {
            var spy = sinon.spy(this.callbacks, 'success');
            var extraInfo = {
                "type":"text",
                "client-info":{
                    "uuid":"xyz",
                    "model":"iPhone3,1",
                    "osVersion":"5.0.1",
                    "carrier":"att",
                    "appVersion":"SugarMobile 1.0",
                    "ismobile":true
                }
            };

            this.server.respondWith("POST", "/rest/v10/login",
                [200, {  "Content-Type":"application/json"},
                    JSON.stringify(this.fixtures["rest/v10/login"].POST.response)]);

            this.api.login(this.validUsername, this.validPassword, extraInfo, this.callbacks);
            this.server.respond(); //tell server to respond to pending async call

            var loginState = this.api.isAuthenticated();

            expect(loginState).toBeTruthy();
        });

        it('should logout user', function () {
            var callspy = sinon.spy(this.api, 'call');
            var ajaxspy = sinon.spy($, 'ajax');
            var spy = sinon.spy(this.callbacks, 'success');

            var extraInfo = {
                "type":"text"
            };

            // login
            this.server.respondWith("POST", "/rest/v10/login",
                [200, {"Content-Type":"application/json"},
                    JSON.stringify(this.fixtures["rest/v10/login"].POST.response)]);

            this.api.login(this.validUsername, this.validPassword, extraInfo, this.callbacks);
            this.server.respond(); //tell server to respond to pending async call

            expect(spy.getCall(0).args[0]).toEqual(this.fixtures["rest/v10/login"].POST.response);
            expect(this.api.isAuthenticated()).toBeTruthy();
            // now check logout
            this.server.respondWith("POST", "/rest/v10/logout", [200, {"Content-Type":"application/json"}, ""]);

            var result = this.api.logout(this.callbacks);

            this.server.respond(); //tell server to respond to pending async call

            expect(callspy.getCall(1).args[1]).toEqual("/rest/v10/logout");
            expect(ajaxspy).toHaveBeenCalledTwice();
            expect(result.status).toEqual(200);
            expect(result.responseText).toEqual("");
            expect(this.api.isAuthenticated()).toBeFalsy();
        });
    });

});

