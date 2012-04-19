describe('SugarCRM Javascript API', function () {

    beforeEach(function () {
        this.api = SUGAR.Api.createInstance({
            serverUrl:"/rest/v10",
            keyValueStore: SugarTest.keyValueStore
        });
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
        if (SugarTest.keyValueStore.set.restore) SugarTest.keyValueStore.set.restore();
        if (SugarTest.keyValueStore.get.restore) SugarTest.keyValueStore.get.restore();
        if (SugarTest.keyValueStore.cut.restore) SugarTest.keyValueStore.cut.restore();
    });


    it('should create a default api instance', function () {
        var api = SUGAR.Api.createInstance();
        expect(api.serverUrl).toEqual('/rest/v10');
        expect(api.isAuthenticated()).toBeFalsy();
    });

    it('should create an authenticated instance if storage has auth token set', function () {

        SugarTest.storage.AuthAccessToken = "xyz";
        var sspy = sinon.spy(SugarTest.keyValueStore, 'get');

        var api = SUGAR.Api.createInstance({
            serverUrl:"/rest/v10",
            platform: "portal",
            keyValueStore: SugarTest.keyValueStore
        });

        expect(api.isAuthenticated()).toBeTruthy();
        expect(sspy).toHaveBeenCalled();
    });

    it('should fail to create an instance if key/value store is invalid', function () {
        expect(function() {
            SUGAR.Api.createInstance({ keyValueStore: {} });
        }).toThrow("Failed to initialize Sugar API: key/value store provider is invalid");
    });

    describe('Request Handler', function () {
        it('should make a request with the correct request url', function () {
            // Spy on jQuery's ajax method
            var spy = sinon.spy(jQuery, 'ajax');

            //@arguments: method, URL, options
            this.api.call('read', '/rest/v10/contact', { date_modified: "2012-02-08 19:18:25" });

            // Spy was called
            expect(spy).toHaveBeenCalled();

            var args = spy.getCall(0).args[0];
            expect(args.url).toEqual("/rest/v10/contact");
            expect(args.headers["If-Modified-Since"]).toEqual("2012-02-08 19:18:25");
        });

        it('should set the right method on request', function () {
            // Spy on jQuery's ajax method
            var spy = sinon.spy(jQuery, 'ajax');

            //@arguments: method, URL, options
            this.api.call('update', '/rest/v10/contacts');

            // Spy was called
            expect(spy).toHaveBeenCalled();

            var args = spy.getCall(0).args[0];
            expect(args.type).toEqual("PUT");
            expect(args.headers["If-Modified-Since"]).toBeUndefined();
        });

        it('should set the right options on request', function () {
            // Spy on jQuery's ajax method
            var spy = sinon.spy(jQuery, 'ajax');

            //@arguments: method, URL, options
            this.api.call('read', '/rest/v10/contacts', null, null, {async:true});

            // Spy was called
            expect(spy).toHaveBeenCalled();

            var args = spy.getCall(0).args[0];
            expect(args.async).toBeTruthy();
            expect(args.headers["If-Modified-Since"]).toBeUndefined();
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

    describe('URL Builder', function () {
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
            expect(url).toEqual('/rest/v10/contacts/1234?fields=first_name%2Clast_name&timestamp=NOW&funky_param=hello+world%2F%25');
        });
    });

    describe('Record CRUD actions', function () {

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

        it('should get a record', function () {
            var spy = sinon.spy(this.callbacks, 'success');
            var attributes = {id:"1234", date_modified: "2012-02-08 19:18:25"};

            this.server.respondWith("GET", "/rest/v10/Contacts/1234",
                [200, {  "Content-Type":"application/json"},
                    JSON.stringify(this.fixtures["rest/v10/contact"].GET.response[1])]);

            this.api.records("read", "Contacts", attributes, null, this.callbacks);
            this.server.respond();

            expect(spy.getCall(0).args[0]).toEqual(this.fixtures["rest/v10/contact"].GET.response[1]);
            expect(this.server.requests[0].requestHeaders["If-Modified-Since"]).toEqual("2012-02-08 19:18:25");
        });

        it('should create record', function () {
            var spy = sinon.spy(this.callbacks, 'success');
            var module = "Contacts";
            var params = "";
            var attributes = {first_name:"Ronald", last_name:"McDonald", phone_work:"0980987", description:"This dude is cool."};

            this.server.respondWith("POST", "/rest/v10/Contacts",
                [200, {  "Content-Type":"application/json"},
                    JSON.stringify(this.fixtures["rest/v10/contact"].POST.response)]);

            this.api.records("create", module, attributes, params, this.callbacks);

            this.server.respond(); //tell server to respond to pending async call
            expect(spy.getCall(0).args[0]).toEqual(this.fixtures["rest/v10/contact"].POST.response);
            // TODO: Check request body
        });

        it('should get records', function () {
            var spy = sinon.spy(this.callbacks, 'success');
            var module = "Contacts";
            var params = "";
            var attributes = {};

            this.server.respondWith("GET", "/rest/v10/Contacts",
                [200, {  "Content-Type":"application/json"},
                    JSON.stringify(this.fixtures["rest/v10/contact"].GET.response)]);

            this.api.records("read", module, attributes, params, this.callbacks);

            this.server.respond(); //tell server to respond to pending async call
            expect(spy.getCall(0).args[0]).toEqual(this.fixtures["rest/v10/contact"].GET.response);
        });

        it('should update record', function () {
            var module = "Contacts";
            var params = "";
            var attributes = {first_name:"Ronald", last_name:"McDonald", phone_work:"1234123", description:"This dude is cool."};
            var spy = sinon.spy(this.callbacks, 'success');

            this.server.respondWith("PUT", "/rest/v10/Contacts",
                [200, {  "Content-Type":"application/json"},
                    ""]);

            this.api.records("update", module, attributes, params, this.callbacks);

            this.server.respond(); //tell server to respond to pending async call
            expect(spy.getCall(0).args[0]).toEqual(null);
            expect(spy.getCall(0).args[2].status).toEqual(200);
            expect(spy.getCall(0).args[2].responseText).toEqual("");
            // TODO: Check request body
        });

        it('should delete record', function () {
            var spy1 = sinon.spy(this.callbacks, 'error');
            var spy = sinon.spy(this.callbacks, 'success');
            var module = "Contacts";
            var params = "";
            var attributes = {id:"1234"};

            this.server.respondWith("DELETE", "/rest/v10/Contacts/1234",
                [200, {  "Content-Type":"application/json"}, ""]);

            this.api.records("delete", module, attributes, params, this.callbacks);

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

    describe('Metadata actions', function () {

        it('should retrieve metadata', function () {
            var types = [];
            var modules = ["Contacts"];
            var callspy = sinon.spy(this.api, 'call');
            var ajaxspy = sinon.spy($, 'ajax');
            var spy = sinon.spy(this.callbacks, 'success');
            //this.api.debug=true;
            this.server.respondWith("GET", "/rest/v10/metadata?typeFilter=&moduleFilter=Contacts",
                [200, {  "Content-Type":"application/json"},
                    JSON.stringify(fixtures.metadata.modules.Contacts)]);

            var xhr = this.api.getMetadata(types, modules, this.callbacks);

            this.server.respond(); //tell server to respond to pending async call
            expect(spy).toHaveBeenCalled();
            expect(spy.getCall(0).args[0]).toEqual(fixtures.metadata.modules.Contacts);

            expect(callspy).toHaveBeenCalled();
            expect(callspy.getCall(0).args[1]).toEqual("/rest/v10/metadata?typeFilter=&moduleFilter=Contacts");

            expect(ajaxspy).toHaveBeenCalledOnce();
        });

    });

    describe("Authentication", function() {
        it('should login users with correct credentials', function () {
            var callspy = sinon.spy(this.api, 'call');
            var ajaxspy = sinon.spy($, 'ajax');
            var spy = sinon.spy(this.callbacks, 'success');
            var sspy = sinon.spy(SugarTest.keyValueStore, 'set');
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

            var xhr = this.api.login({ username: "admin", password: "password" }, extraInfo, this.callbacks);
            this.server.respond();

            expect(spy).toHaveBeenCalled();
            expect(spy.getCall(0).args[0]).toEqual(this.fixtures["rest/v10/login"].POST.response);

            expect(callspy).toHaveBeenCalled();
            expect(callspy.getCall(0).args[1]).toEqual("/rest/v10/login");

            expect(ajaxspy).toHaveBeenCalledOnce();
            expect(this.api.isAuthenticated()).toBeTruthy();
            expect(SugarTest.storage["AuthAccessToken"]).toEqual("55000555");
            expect(sspy).toHaveBeenCalled();

            // TODO: Check request body
        });

        it('should not login users with incorrect credentials', function () {
            var callspy = sinon.spy(this.api, 'call');
            var ajaxspy = sinon.spy($, 'ajax');
            var spy = sinon.spy(this.callbacks, 'error');
            var sspy = sinon.spy(SugarTest.keyValueStore, 'cut');
            this.server.respondWith("POST", "/rest/v10/login",
                [401, {  "Content-Type":"application/json"},
                    ""]);

            var xhr = this.api.login({ username:"invalid", password:"invalid" }, null, this.callbacks);

            this.server.respond();

            expect(spy).toHaveBeenCalled();
            expect(spy.getCall(0).args[0].status).toEqual(401);
            expect(spy.getCall(0).args[0].responseText).toEqual("");

            expect(callspy.getCall(0).args[1]).toEqual("/rest/v10/login");
            expect(callspy).toHaveBeenCalled();

            expect(ajaxspy).toHaveBeenCalledOnce();

            expect(this.api.isAuthenticated()).toBeFalsy();
            expect(SugarTest.storage["AuthAccessToken"]).toBeUndefined();
            expect(sspy).toHaveBeenCalled();

            // TODO: Check request body
        });

        it('should logout user', function () {
            var callspy = sinon.spy(this.api, 'call');
            var ajaxspy = sinon.spy($, 'ajax');
            var spy = sinon.spy(this.callbacks, 'success');
            var sspy = sinon.spy(SugarTest.keyValueStore, 'cut');

            this.server.respondWith("POST", "/rest/v10/logout", [200, {"Content-Type":"application/json"}, ""]);

            var xhr = this.api.logout(this.callbacks);

            this.server.respond();

            expect(spy).toHaveBeenCalled();

            expect(callspy).toHaveBeenCalled();
            expect(callspy.getCall(0).args[1]).toEqual("/rest/v10/logout");

            expect(ajaxspy).toHaveBeenCalled();

            expect(this.api.isAuthenticated()).toBeFalsy();
            expect(SugarTest.storage["AuthAccessToken"]).toBeUndefined();
            expect(sspy).toHaveBeenCalled();

            // TODO: Check request body
        });
    });

});
