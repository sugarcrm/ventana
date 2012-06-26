describe('SugarCRM Javascript API', function () {

    beforeEach(function () {
        this.api = SUGAR.Api.createInstance({
            serverUrl:"/rest/v10",
            keyValueStore: SugarTest.keyValueStore
        });
        this.fixtures = fixtures.api;
        this.fixtures.fields = fixtures.metadata.fields;
        SugarTest.seedFakeServer();
        this.callbacks = {
            success:function (data) {},
            error:function (data) {}
        };
    });

    afterEach(function () {
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
        var sspy = sinon.spy(SugarTest.keyValueStore, 'get'),
            api = SUGAR.Api.createInstance({
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
            var spy = sinon.spy(jQuery, 'ajax'), args;

            //@arguments: method, URL, options
            this.api.call('read', '/rest/v10/contact', { date_modified: "2012-02-08 19:18:25" });

            // Spy was called
            expect(spy).toHaveBeenCalled();

            args = spy.getCall(0).args[0];
            expect(args.url).toEqual("/rest/v10/contact");
            expect(args.headers["If-Modified-Since"]).toEqual("2012-02-08 19:18:25");
        });

        it('should set the right method on request', function () {
            // Spy on jQuery's ajax method
            var spy = sinon.spy(jQuery, 'ajax'), args;

            //@arguments: method, URL, options
            this.api.call('update', '/rest/v10/contacts');

            // Spy was called
            expect(spy).toHaveBeenCalled();

            args = spy.getCall(0).args[0];
            expect(args.type).toEqual("PUT");
            expect(args.headers["If-Modified-Since"]).toBeUndefined();
        });

        it('should set the right options on request', function () {
            // Spy on jQuery's ajax method
            var spy = sinon.spy(jQuery, 'ajax'), args;

            //@arguments: method, URL, options
            this.api.call('read', '/rest/v10/contacts', null, null, {async:true});

            // Spy was called
            expect(spy).toHaveBeenCalled();

            args = spy.getCall(0).args[0];
            expect(args.async).toBeTruthy();
            expect(args.headers["If-Modified-Since"]).toBeUndefined();
        });

        it('should handle successful responses', function () {
            var aContact = this.fixtures["rest/v10/contact"].GET.response.records[1],
                uri = "/rest/v10/contacts/1234", result;

            SugarTest.server.respondWith("GET", uri,
                [200, {  "Content-Type":"application/json"},
                    JSON.stringify(aContact)]);
            result = this.api.call('read', uri, null, null, this.callbacks);
            SugarTest.server.respond(); 

            expect(result.responseText).toEqual(JSON.stringify(aContact));
        });

        it('should fire error callbacks and return requests objects on error', function () {

            SugarTest.server.respondWith("GET", "rest/v10/contacts/123",
                [fixtures.api.responseErrors.fourhundred.code, { "Content-Type":"application/json" },
                    this.fixtures.responseErrors.fourhundred.body]);
            var result = this.api.call('read', 'rest/v10/contacts/123', null, null, this.callbacks);

            SugarTest.server.respond(); //tell server to respond to pending async call

            expect(result.responseText).toEqual(this.fixtures.responseErrors.fourhundred.body);
        });
    });

    describe('URL Builder', function () {
        it('should build resource URLs for resources without ids', function () {
            var url = this.api.buildURL("contacts", "create");
            expect(url).toEqual('/rest/v10/contacts');
        });

        it('should build resource URLs for resources without ids if id exists in attributes', function () {
            var attributes = { id: "1" },
                url = this.api.buildURL("contacts", "create", attributes);

            expect(url).toEqual('/rest/v10/contacts');
        });

        it('should build resource URLs for resources with ID and standard actions', function () {
            var attributes = { id:'1234' },
                url = this.api.buildURL("contacts", "update", attributes);

            expect(url).toEqual('/rest/v10/contacts/1234');
        });

        it('should build resource URLs for resources with standard actions', function () {
            var module = "Contacts",
                action = "",
                attributes = { id:'1234' },
                url = this.api.buildURL(module, action, attributes);

            expect(url).toEqual('/rest/v10/Contacts/1234');
        });

        it('should build resource URLs for resources with custom actions', function () {
            var module = "Contacts",
                action = "customAction",
                attributes = { id:'1234' },
                url = this.api.buildURL("contacts", "customAction", attributes);

            expect(url).toEqual('/rest/v10/contacts/1234/customAction');
        });

        it('should build resource URLs for resources with link and related id', function () {
            var attributes = {
                    id:'1234',
                    relatedId: '4567'
                },
                url = this.api.buildURL("contacts", "opportunities", attributes);

            expect(url).toEqual('/rest/v10/contacts/1234/opportunities/4567');
        });


        it('should build resource URLs for resources with custom params', function () {
            var params = {
                    "fields": "first_name,last_name",
                    "timestamp": "NOW",
                    "funky_param": "hello world/%"
                },
                attributes = { id:'1234'},
                url = this.api.buildURL("contacts", "update", attributes, params);
            expect(url).toEqual('/rest/v10/contacts/1234?fields=first_name%2Clast_name&timestamp=NOW&funky_param=hello+world%2F%25');
        });

        it('should build resource URLs for fetching a link', function() {
            var params = { max_num: 20 },
            attributes = { id:'seed_jim_id', link:'reportees', related: null, relatedId: undefined },
            url = this.api.buildURL("Users", "reportees", attributes, params);
            expect(url).toEqual('/rest/v10/Users/seed_jim_id/link/reportees?max_num=20');
        });

        it('should build resource URLs to access the File API', function() {
            var params = { format: "sugar-html-json" },
            attributes = { id:'note_id', fileField: 'fileField', link:'notes' },
            url = this.api.buildURL("Notes", "file", attributes, params);
            expect(url).toEqual('/rest/v10/Notes/note_id/file/fileField?format=sugar-html-json');
        });
    });

    describe('Record CRUD actions', function () {

        it('search a module', function () {
            var spy = sinon.spy(this.callbacks, 'success'),
                modules = "Contacts, Bugs, Leads",
                query = "bob",
                recordOne = this.fixtures["rest/v10/contact"].GET.response.records[1],
                fields = "first_name,last_name";
                SugarTest.server.respondWith("GET", /.*\/rest\/v10\/search\?.*q=bob/,
                [200, {  "Content-Type":"application/json"},
                    JSON.stringify(recordOne)]);

            this.api.search({query:query, moduleList: modules, fields: fields, maxNum:20}, this.callbacks);
            SugarTest.server.respond(); 
            expect(spy).toHaveBeenCalledOnce();
            expect(spy).toHaveBeenCalledWith(recordOne);
        });

        it('should get a record', function () {
            var spy = sinon.spy(this.callbacks, 'success'),
                attributes = {id:"1234", date_modified: "2012-02-08 19:18:25"},
                recordOne = this.fixtures["rest/v10/contact"].GET.response.records[1];

            SugarTest.server.respondWith("GET", "/rest/v10/Contacts/1234",
                [200, {  "Content-Type":"application/json"},
                    JSON.stringify(recordOne)]);

            this.api.records("read", "Contacts", attributes, null, this.callbacks);
            SugarTest.server.respond();

            expect(spy.getCall(0).args[0]).toEqual(recordOne);
            expect(SugarTest.server.requests[0].requestHeaders["If-Modified-Since"]).toEqual("2012-02-08 19:18:25");
        });

        it('should create record', function () {
            var spy = sinon.spy(this.callbacks, 'success'),
                module = "Contacts", params = "", req = null,
                attributes = {first_name:"Ronald", last_name:"McDonald", phone_work:"0980987", description:"This dude is cool."},
                postResponse = this.fixtures["rest/v10/contact"].POST.response;

            SugarTest.server.respondWith("POST", "/rest/v10/Contacts",
                [200, {  "Content-Type":"application/json"},
                    JSON.stringify(postResponse)]);

            this.api.records("create", module, attributes, params, this.callbacks);
            SugarTest.server.respond(); 

            expect(spy.getCall(0).args[0]).toEqual(postResponse);
            req = SugarTest.server.requests[0];
            expect(req.responseText).toMatch(/^\{.guid/);
            expect(req.requestBody).toEqual('{"first_name":"Ronald","last_name":"McDonald","phone_work":"0980987","description":"This dude is cool."}');
        });

        it('should get records', function () {
            var spy = sinon.spy(this.callbacks, 'success'), 
                module = "Contacts",
                params = "", data = null, req = null, attributes = {},
                records = this.fixtures["rest/v10/contact"].GET.response.records;

            SugarTest.server.respondWith("GET", "/rest/v10/Contacts",
                [200, {  "Content-Type":"application/json"},
                    JSON.stringify(records)]);

            this.api.records("read", module, attributes, params, this.callbacks);
            SugarTest.server.respond(); 

            expect(spy.getCall(0).args[0]).toEqual(records);
            req  = SugarTest.server.requests[0];
            expect(req.requestBody).toBeNull();
            data = JSON.parse(req.responseText);
            expect(data.length).toEqual(2);
        });

        it('should update record', function () {
            var module = "Contacts",
                params = "",
                req = null,
                attributes = {first_name:"Ronald", last_name:"McDonald", phone_work:"1234123", description:"This dude is cool."},
                spy = sinon.spy(this.callbacks, 'success');

            SugarTest.server.respondWith("PUT", "/rest/v10/Contacts",
                [200, {  "Content-Type":"application/json"},
                    ""]);

            this.api.records("update", module, attributes, params, this.callbacks);
            SugarTest.server.respond(); 

            expect(spy.getCall(0).args[0]).toEqual(null);
            expect(spy.getCall(0).args[2].status).toEqual(200);
            expect(spy.getCall(0).args[2].responseText).toEqual("");
            req  = SugarTest.server.requests[0];
            expect(req.requestBody).toEqual(JSON.stringify(attributes));
        });

        it('should delete record', function () {
            var spy1 = sinon.spy(this.callbacks, 'error'),
                spy = sinon.spy(this.callbacks, 'success'),
                module = "Contacts",
                params = "",
                attributes = {id:"1234"};

            SugarTest.server.respondWith("DELETE", "/rest/v10/Contacts/1234",
                [200, {  "Content-Type":"application/json"}, ""]);

            this.api.records("delete", module, attributes, params, this.callbacks);
            SugarTest.server.respond(); 

            expect(spy.getCall(0).args[0]).toEqual(null);
            expect(spy.getCall(0).args[2].status).toEqual(200);
            expect(spy.getCall(0).args[2].responseText).toEqual("");
        });
    });

    describe('Relationship CRUD actions', function () {

        it('should fetch relationships', function () {
            var spy = sinon.spy(this.callbacks, 'success'),
                module = "opportunities", data = null,
                attributes = {
                    id: "1",
                    link: "contacts"
                },
                respFixture = this.fixtures["rest/v10/opportunities/1/link/contacts"].GET.response;

            SugarTest.server.respondWith("GET", "/rest/v10/opportunities/1/link/contacts",
                [200, {  "Content-Type":"application/json"},
                    JSON.stringify(respFixture)]);

            this.api.relationships("read", module, attributes, null, this.callbacks);
            SugarTest.server.respond();
            
            expect(spy.getCall(0).args[0]).toEqual(respFixture);
            data = JSON.parse(SugarTest.server.requests[0].responseText);
            expect(data.records.length).toEqual(3);
            expect(data.next_offset).toEqual(2);
        });


        it('should create a relationship', function () {
            var fixture = this.fixtures["rest/v10/opportunities/1/link/contacts"].POST.response,
                spy = sinon.spy(this.callbacks, 'success'),
                module = "opportunities",
                req = null, record = null,
                attributes = {
                    id: '1',
                    link: "contacts",
                    related: {
                        first_name: "Ronald",
                        last_name: "McDonald",
                        opportunity_role: "Influencer"
                    }
                };

            SugarTest.server.respondWith("POST", "/rest/v10/opportunities/1/link/contacts",
                [200, {  "Content-Type":"application/json"},
                    JSON.stringify(fixture)]);

            this.api.relationships("create", module, attributes, null, this.callbacks);

            SugarTest.server.respond();

            req = SugarTest.server.requests[0];
            expect(JSON.parse(req.requestBody)).toEqual(attributes.related);
            expect(spy.getCall(0).args[0]).toEqual(fixture);
            expect(req.requestBody).toEqual(JSON.stringify(attributes.related));
            record = JSON.parse(req.responseText).record;
            expect(record.name).toEqual(fixture.record.name);
        });


        it('should update a relationship', function () {
            var respFixture = this.fixtures["rest/v10/opportunities/1/link/contacts"].PUT.response,
                module = "opportunities",
                requestBody = null,
                spy = sinon.spy(this.callbacks, 'success'),
                attributes = {
                    id: '1',
                    link: "contacts",
                    relatedId: "2",
                    related: {
                        opportunity_role: "Primary Decision Maker"
                    }
                };

            SugarTest.server.respondWith("PUT", "/rest/v10/opportunities/1/link/contacts/2",
                [200, {  "Content-Type":"application/json"}, JSON.stringify(respFixture)]);

            this.api.relationships("update", module, attributes, null, this.callbacks);

            SugarTest.server.respond();
            expect(spy.getCall(0).args[0]).toEqual(respFixture);
            requestBody = SugarTest.server.requests[0].requestBody;
            expect(requestBody).toEqual(JSON.stringify(attributes.related));
        });

        it('should delete a relationship', function () {
            var fixture = this.fixtures["rest/v10/opportunities/1/link/contacts"],
                module = "opportunities",
                spy = sinon.spy(this.callbacks, 'success'),
                attributes = {
                    id: '1',
                    link: "contacts",
                    relatedId: "2"
                };

            SugarTest.server.respondWith("DELETE", "/rest/v10/opportunities/1/link/contacts/2",
                [200, {  "Content-Type":"application/json"}, JSON.stringify(fixture.DELETE.response)]);

            this.api.relationships("delete", module, attributes, null, this.callbacks);

            SugarTest.server.respond();
            expect(SugarTest.server.requests[0].requestBody).toBeNull();
            expect(spy.getCall(0).args[0]).toEqual(fixture.DELETE.response);
        });

    });

    describe('Metadata actions', function () {

        it('should delegate to the call method', function () {
            var callspy = sinon.spy(this.api, 'call');

            SugarTest.server.respondWith("GET", "/rest/v10/metadata?typeFilter=&moduleFilter=Contacts",
                [200, {  "Content-Type":"application/json"},
                    JSON.stringify(fixtures.metadata.modules.Contacts)]);
            this.api.getMetadata("hash", [], ['Contacts'], this.callbacks);
            SugarTest.server.respond(); 

            expect(callspy).toHaveBeenCalled();
            expect(callspy.getCall(0).args[1]).toEqual("/rest/v10/metadata?typeFilter=&moduleFilter=Contacts&_hash=hash");
        });

        it('should retrieve metadata', function () {
            var types = [],
                modules = ["Contacts"],
                spy = sinon.spy(this.callbacks, 'success');
            //this.api.debug=true;
            SugarTest.server.respondWith("GET", "/rest/v10/metadata?typeFilter=&moduleFilter=Contacts&_hash=hash",
                [200, {  "Content-Type":"application/json"},
                    JSON.stringify(fixtures.metadata.modules.Contacts)]);

            this.api.getMetadata("hash", types, modules, this.callbacks);
            SugarTest.server.respond(); //tell server to respond to pending async call

            expect(spy).toHaveBeenCalled();
            expect(spy.getCall(0).args[0]).toEqual(fixtures.metadata.modules.Contacts);
        });

    });

    describe("Authentication", function() {
        it('should login users with correct credentials', function () {
            var spy = sinon.spy(this.callbacks, 'success'),
                requestBody = null,
                sspy = sinon.spy(SugarTest.keyValueStore, 'set'),
                extraInfo = {
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

            SugarTest.server.respondWith("POST", "/rest/v10/oauth2/token",
                [200, {  "Content-Type":"application/json"},
                    JSON.stringify(this.fixtures["/rest/v10/oauth2/token"].POST.response)]);

            this.api.login({ username: "admin", password: "password" }, extraInfo, this.callbacks);
            SugarTest.server.respond();

            expect(spy).toHaveBeenCalled();
            expect(spy.getCall(0).args[0]).toEqual(this.fixtures["/rest/v10/oauth2/token"].POST.response);

            expect(this.api.isAuthenticated()).toBeTruthy();
            expect(SugarTest.storage["AuthAccessToken"]).toEqual("55000555");
            expect(sspy).toHaveBeenCalled();

            requestBody = JSON.parse(SugarTest.server.requests[0].requestBody);
            expect(requestBody['client-info'].uuid).toEqual(extraInfo['client-info'].uuid);
            expect(requestBody.username).toEqual('admin');
        });

        it('should not login users with incorrect credentials', function () {
            var spy = sinon.spy(this.callbacks, 'error'),
                sspy = sinon.spy(SugarTest.keyValueStore, 'cut'), requestBody;

            SugarTest.server.respondWith("POST", "/rest/v10/oauth2/token",
                [401, {  "Content-Type":"application/json"},
                    ""]);
            this.api.login({ username:"invalid", password:"invalid" }, null, this.callbacks);
            SugarTest.server.respond();

            expect(spy).toHaveBeenCalled();
            expect(spy.getCall(0).args[0].status).toEqual(401);
            expect(spy.getCall(0).args[0].responseText).toEqual("");

            expect(this.api.isAuthenticated()).toBeFalsy();
            expect(SugarTest.storage["AuthAccessToken"]).toBeUndefined();
            expect(sspy).toHaveBeenCalled();

            requestBody = JSON.parse(SugarTest.server.requests[0].requestBody);
            expect(requestBody.username).toEqual('invalid');
            expect(requestBody.password).toEqual('invalid');
        });

        it('should logout user', function () {
            var spy = sinon.spy(this.callbacks, 'success'),
                sspy = sinon.spy(SugarTest.keyValueStore, 'cut');

            SugarTest.server.respondWith("POST", "/rest/v10/oauth2/logout", [200, {"Content-Type":"application/json"}, ""]);

            this.api.logout(this.callbacks);
            SugarTest.server.respond();

            expect(spy).toHaveBeenCalled();

            expect(this.api.isAuthenticated()).toBeFalsy();
            expect(SugarTest.storage["AuthAccessToken"]).toBeUndefined();
            expect(sspy).toHaveBeenCalled();
        });
    });

});
