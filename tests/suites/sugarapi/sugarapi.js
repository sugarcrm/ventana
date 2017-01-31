/*
 * Your installation or use of this SugarCRM file is subject to the applicable
 * terms available at
 * http://support.sugarcrm.com/Resources/Master_Subscription_Agreements/.
 * If you do not agree to all of the applicable terms or do not have the
 * authority to bind the entity as an authorized representative, then do not
 * install or use this SugarCRM file.
 *
 * Copyright (C) SugarCRM Inc. All rights reserved.
 */
describe('SugarCRM Javascript API', function () {

    function restoreApiSingleton() {
        // Essentially, this will go back to an API instance per user's config file
        SUGAR.Api.createInstance({
            reset: true,
            serverUrl: SUGAR.App.config.serverUrl,
            platform: SUGAR.App.config.platform,
            timeout: SUGAR.App.config.serverTimeout,
            keyValueStore: SUGAR.App[SUGAR.App.config.authStore || "cache"],
            clientID: SUGAR.App.config.clientID
        });
    }

    beforeEach(function () {
        SugarTest.storage.AuthAccessToken = "xyz";
        SugarTest.storage.AuthRefreshToken = "abc";
        SugarTest.storage.DownloadToken = "zxc";

        this.api = SUGAR.Api.createInstance({
            serverUrl:"/rest/v10",
            keyValueStore: SugarTest.keyValueStore
        });
        this.fixtures = fixtures.api;
        this.fixtures.fields = fixtures.metadata.fields;
        SugarTest.seedFakeServer();
        var self = this;
        this.callbacks = {
            success:function (data) {},
            error:function (error) { self.httpError = error },
            complete: function() {}
        };
        this.httpError = null;
        //Override the normal app sync after refresh
        this.api.setRefreshTokenSuccessCallback(function(c){c();});
    });

    afterEach(function () {
        sinon.collection.restore();
        if (this.callbacks.success.restore) this.callbacks.success.restore();
        if (this.callbacks.error.restore) this.callbacks.error.restore();
        if (this.callbacks.complete.restore) this.callbacks.complete.restore();
        if (this.api.call.restore) this.api.call.restore();
        if ($.ajax.restore) $.ajax.restore();
        if (SugarTest.keyValueStore.set.restore) SugarTest.keyValueStore.set.restore();
        if (SugarTest.keyValueStore.get.restore) SugarTest.keyValueStore.get.restore();
        if (SugarTest.keyValueStore.cut.restore) SugarTest.keyValueStore.cut.restore();

        // Since api is a singleton .. /rest/v10 becomes the new serverUrl for all other tests.
        restoreApiSingleton();
    });

    describe('Sugar Api Creation', function () {
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

    });

    describe('Fallback Error Handler', function () {

        it('should create instance taking an "on error" fallback http handler', function () {
            var stubHttpErrorHandler = sinon.stub(),
                api = SUGAR.Api.createInstance({
                    defaultErrorHandler: stubHttpErrorHandler
                });
            expect(api.defaultErrorHandler).toEqual(stubHttpErrorHandler);
        });

        it("should use default fallback http handler", function() {
            var stubHttpErrorHandler = sinon.stub(),
                api = SUGAR.Api.createInstance({
                    defaultErrorHandler: stubHttpErrorHandler
                });
            var response = {"error": "invalid_grant", "error_description": "some desc"};
            SugarTest.server.respondWith(function(xhr) {
                var status = 401,
                    responseText = JSON.stringify(response);
                xhr.respond(status, {"Content-Type": "application/json"}, responseText);
            });

            api.call('create', '/rest/v10/oauth2/token');
            SugarTest.server.respond();
            expect(stubHttpErrorHandler).toHaveBeenCalled();
        });

        it("should favor callback.error over the default fallback http handler", function() {
            var stubHttpErrorHandler = sinon.stub(),
                callbackError = sinon.stub(),
                api = SUGAR.Api.createInstance({
                    defaultErrorHandler: stubHttpErrorHandler
                });
            var response = {"error": "invalid_grant", "error_description": "some desc"};
            SugarTest.server.respondWith(function(xhr) {
                var status = 401,
                    responseText = JSON.stringify(response);
                xhr.respond(status, {"Content-Type": "application/json"}, responseText);
            });

            api.call('create', '/rest/v10/oauth2/token', null, {error: callbackError});
            SugarTest.server.respond();
            expect(callbackError).toHaveBeenCalled();
            expect(stubHttpErrorHandler).not.toHaveBeenCalled();
        });
    });

    describe('Request Handler', function () {
        it('should make a request with the correct request url', function () {
            var spy = sinon.spy($, 'ajax'), args;

            //@arguments: method, URL, options
            this.api.call('read', '/rest/v10/contact', { date_modified: "2012-02-08 19:18:25" });

            // Spy was called
            expect(spy).toHaveBeenCalled();

            args = spy.getCall(0).args[0];
            expect(args.url).toEqual("/rest/v10/contact");
            expect(args.headers["If-Modified-Since"]).toBeUndefined();
            expect(args.headers["OAuth-Token"]).toBeDefined();
        });

        it('should set the right method on request', function () {
            var spy = sinon.spy($, 'ajax'), args;

            //@arguments: method, URL, options
            this.api.call('update', '/rest/v10/contacts');
            SugarTest.server.respond(); //Must respond to prevent hanging requests.

            // Spy was called
            expect(spy).toHaveBeenCalled();

            args = spy.getCall(0).args[0];
            expect(args.type).toEqual("PUT");
            expect(args.headers["If-Modified-Since"]).toBeUndefined();
        });

        it('should not set oauth header for auth requests', function () {
            var spy = sinon.spy($, 'ajax'), args;

            this.api.call('create', '/rest/v10/oauth2/token');
            SugarTest.server.respond();

            expect(spy).toHaveBeenCalled();
            args = spy.getCall(0).args[0];
            expect(args.headers["OAuth-Token"]).toBeUndefined();
        });

        it('should set the right options on request', function () {
            var spy = sinon.spy($, 'ajax'), args;

            //@arguments: method, URL, options
            this.api.call('read', '/rest/v10/contacts', null, null, {async:true});
            SugarTest.server.respond(); //Must respond to prevent hanging requests.

            // Spy was called
            expect(spy).toHaveBeenCalled();

            args = spy.getCall(0).args[0];
            expect(args.async).toBeTruthy();
            expect(args.headers["If-Modified-Since"]).toBeUndefined();
        });

        it('should handle successful responses', function () {
            var aContact = this.fixtures["rest/v10/contact"].GET.response.records[1],
                uri = "/rest/v10/Contacts/1234",
                result;

            SugarTest.server.respondWith("GET", uri,
                [200, {  "Content-Type":"application/json"},
                    JSON.stringify(aContact)]);
            result = this.api.call('read', uri, null, null, this.callbacks);
            SugarTest.server.respond();

            expect(result.xhr.responseText).toEqual(JSON.stringify(aContact));
        });

        it('should fire error callbacks and return requests objects on error', function () {

            SugarTest.server.respondWith("GET", "rest/v10/contacts/123",
                [fixtures.api.responseErrors.fourhundred.code, { "Content-Type":"application/json" },
                    this.fixtures.responseErrors.fourhundred.body]);
            var result = this.api.call('read', 'rest/v10/contacts/123', null, null, this.callbacks);

            SugarTest.server.respond(); //tell server to respond to pending async call

            expect(result.xhr.responseText).toEqual(this.fixtures.responseErrors.fourhundred.body);
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

        it('should build resource URLs for resources with link and link name', function () {
            var attributes = {
                    id:'1234',
                    link: 'opportunities'
                },
                url = this.api.buildURL("contacts", null, attributes);

            expect(url).toEqual('/rest/v10/contacts/1234/link/opportunities');
        });

        it('should build resource URLs for resources to create links', function () {
            var attributes = {
                    id:'1234',
                    link: true
                },
                url = this.api.buildURL("contacts", null, attributes);

            expect(url).toEqual('/rest/v10/contacts/1234/link');
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
            url = this.api.buildURL("Users", null, attributes, params);
            expect(url).toEqual('/rest/v10/Users/seed_jim_id/link/reportees?max_num=20');
        });

        it('should build resource URLs to access the File API', function() {
            var attributes = { module: 'Notes', id: 'note_id', field: 'fileField' },
                url = this.api.buildFileURL(attributes),
                options;

            expect(url).toEqual('/rest/v10/Notes/note_id/file/fileField?format=sugar-html-json');

            options = { platform: "base" };
            url = this.api.buildFileURL(attributes, options);
            expect(url).toEqual('/rest/v10/Notes/note_id/file/fileField?format=sugar-html-json&platform=base');

            options = { htmlJsonFormat: false };
            url = this.api.buildFileURL(attributes, options);
            expect(url).toEqual('/rest/v10/Notes/note_id/file/fileField');

            attributes = { module: 'Notes', id: 'note_id' };
            url = this.api.buildFileURL(attributes, options);
            expect(url).toEqual('/rest/v10/Notes/note_id/file');

            options = { platform: 'mobile' };
            url = this.api.buildFileURL(attributes, options);
            expect(url).toEqual('/rest/v10/Notes/note_id/file?platform=mobile');

            options = { htmlJsonFormat: false };
            url = this.api.buildFileURL(attributes, options);
            expect(url).toEqual('/rest/v10/Notes/note_id/file');

            options = { htmlJsonFormat: false, forceDownload: true };
            url = this.api.buildFileURL(attributes, options);
            expect(url).toEqual('/rest/v10/Notes/note_id/file?force_download=1');

            options = { htmlJsonFormat: false, forceDownload: false };
            url = this.api.buildFileURL(attributes, options);
            expect(url).toEqual('/rest/v10/Notes/note_id/file?force_download=0');

            options = { passOAuthToken: true };
            url = this.api.buildFileURL(attributes, options);
            expect(url).toEqual('/rest/v10/Notes/note_id/file?oauth_token=xyz');

            options = { passDownloadToken: true };
            url = this.api.buildFileURL(attributes, options);
            expect(url).toEqual('/rest/v10/Notes/note_id/file?download_token=zxc');

            //cleanCache url
            options = { cleanCache: true };
            url = this.api.buildFileURL(attributes, options);
            var clock = sinon.useFakeTimers();
            //waiting for next time request
            clock.tick(100);
            var nextUrl = this.api.buildFileURL(attributes, options);
            expect(url).not.toBe(nextUrl);
            clock.restore();
        });

        it('should build resource URLs to access the Export API', function() {
            SugarTest.server.respondWith("POST", "/rest/v10/Accounts/record_list",
                [200, { "Content-Type":"application/json" },
                 '{"id":"12345-67890-11-12","records":["a","b","c"],"module_name":"Accounts"}']);
            var fileDownloadStub = sinon.stub(this.api, 'fileDownload');
            var result = this.api.exportRecords(
                {
                    'module':'Accounts',
                    'uid':['a','b','c']
                }, 
                'fakeEl',
                'fakeCallbacks',
                []);

            SugarTest.server.respond(); //tell server to respond to pending async call

            expect(fileDownloadStub).toHaveBeenCalled();
            expect(fileDownloadStub.getCall(0).args[0]).toEqual("/rest/v10/Accounts/export/12345-67890-11-12");
            fileDownloadStub.restore();
        });

        it('should build resource URLs for fetching a link with a filter definition', function() {
            var params = { max_num: 20, filter: [{'name': 'Jim'}] },
            attributes = { id:'guidguidguid', link:'contacts', related: null, relatedId: undefined },
            url = this.api.buildURL("Accounts", null, attributes, params);
            expect(url).toEqual('/rest/v10/Accounts/guidguidguid/link/contacts?max_num=20&filter%5B0%5D%5Bname%5D=Jim');
        });

        it('eliminates null and undefined params from the querystring', function() {
            var params = { bad: null, worse: undefined},
                attributes = { id:'1234' };
            var url = this.api.buildURL('Accounts','read',attributes,params);
            expect(url).toEqual('/rest/v10/Accounts/1234');

        });
    });

    describe("Enum API", function(){
        it("should fetch enum options for a field", function(){
            var spy = sinon.spy(this.callbacks, 'success'),
                apispy = sinon.spy(this.api, 'call'),
                module = "Bugs",
                field ="fixed_in_release",
                options = {"":"","caf2f716-7fed-12fb-8ce7-5138c8999447":"3.14"};

            SugarTest.server.respondWith("GET", "/rest/v10/Bugs/enum/fixed_in_release",
                [200, {  "Content-Type":"application/json"}, JSON.stringify(options)]);

            var request = this.api.enumOptions(module, field, this.callbacks);
            SugarTest.server.respond();

            expect(spy).toHaveBeenCalledWith(options, request);
            expect(apispy.getCall(0).args[1]).toContain("Bugs/enum/fixed_in_release");
            spy.restore();
            apispy.restore();
        });
    });

    describe('Record CRUD actions', function () {

        it('search a module', function () {
            var spy = sinon.spy(this.callbacks, 'success'),
                modules = "Contacts, Bugs, Leads",
                query = "bob",
                recordOne = this.fixtures["rest/v10/contact"].GET.response.records[1],
                fields = "first_name,last_name";
                SugarTest.server.respondWith("GET", /.*\/rest\/v10\/globalsearch\?.*q=bob/,
                [200, {  "Content-Type":"application/json"},
                    JSON.stringify(recordOne)]);

            this.api.search({q:query, module_list: modules, fields: fields, max_num:20}, this.callbacks, {useNewApi: true});
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

            expect(spy).toHaveBeenCalled();
            expect(spy.getCall(0).args[0]).toEqual(recordOne);
            expect(SugarTest.server.requests[0].requestHeaders["If-Modified-Since"]).toBeUndefined();
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

            expect(spy).toHaveBeenCalled();
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

            expect(spy).toHaveBeenCalled();
            expect(spy.getCall(0).args[0]).toEqual(records);
            req  = SugarTest.server.requests[0];
            expect(req.requestBody).toBeNull();
            data = JSON.parse(req.responseText);
            expect(data.length).toEqual(2);
        });

        it('should update record', function () {
            var module = "Contacts",
                params = "",
                attributes = {first_name:"Ronald", last_name:"McDonald", phone_work:"1234123", description:"This dude is cool."},
                spy = sinon.spy(this.callbacks, 'success'),
                cspy = sinon.spy(this.callbacks, 'complete');

            SugarTest.server.respondWith("PUT", "/rest/v10/Contacts",
                [200, {  "Content-Type":"application/json"},
                    ""]);

            var request = this.api.records("update", module, attributes, params, this.callbacks);
            SugarTest.server.respond();

            expect(spy).toHaveBeenCalledWith(null, request);
            expect(cspy).toHaveBeenCalledWith(request);
            var req = SugarTest.server.requests[0];
            expect(req.requestBody).toEqual(JSON.stringify(attributes));
        });

        it('should delete record', function () {
            var spy = sinon.spy(this.callbacks, 'success'),
                module = "Contacts",
                params = "",
                attributes = {id:"1234"};

            SugarTest.server.respondWith("DELETE", "/rest/v10/Contacts/1234",
                [200, {  "Content-Type":"application/json"}, ""]);

            var request = this.api.records("delete", module, attributes, params, this.callbacks);
            SugarTest.server.respond();

            expect(spy).toHaveBeenCalledWith(null, request);
            expect(spy.getCall(0).args[0]).toEqual(null);
        });

        it('should favorite record', function () {
            var spy = sinon.spy(this.callbacks, 'success'),
                module = "Contacts",
                id ="1234";

            SugarTest.server.respondWith("PUT", "/rest/v10/Contacts/1234/favorite",
                [200, {  "Content-Type":"application/json"}, ""]);

            var request = this.api.favorite(module, id, true, this.callbacks);
            SugarTest.server.respond();

            expect(spy).toHaveBeenCalledWith(null, request);
        });

        it('should unfavorite record', function () {
            var spy = sinon.spy(this.callbacks, 'success'),
                module = "Contacts",
                id ="1234";

            SugarTest.server.respondWith("PUT", "/rest/v10/Contacts/1234/unfavorite",
                [200, {  "Content-Type":"application/json"}, ""]);

            var request = this.api.favorite(module, id, false, this.callbacks);
            SugarTest.server.respond();

            expect(spy).toHaveBeenCalledWith(null, request);
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

    describe('Password', function () {

        it('should verify password', function () {
            var callspy = sinon.spy(this.api, 'call');

            SugarTest.server.respondWith("POST", "/rest/v10/me/password",
                [200, {  "Content-Type":"application/json"},
                    JSON.stringify({current_user: {valid: true}})]);
            this.api.verifyPassword("passwordtocheck", null);

            SugarTest.server.respond();

            expect(callspy).toHaveBeenCalled();
            expect(callspy.getCall(0).args[0]).toEqual("create");
            expect(callspy.getCall(0).args[1]).toEqual("/rest/v10/me/password");
            expect(callspy.getCall(0).args[2].password_to_verify).toEqual("passwordtocheck");
            callspy.restore();
        });

        it('should update password', function () {
            var callspy = sinon.spy(this.api, 'call');

            SugarTest.server.respondWith("PUT", "/rest/v10/me/password",
                [200, {  "Content-Type":"application/json"},
                    JSON.stringify({current_user: {valid: true}})]);
            this.api.updatePassword("old", "new", null);

            SugarTest.server.respond();

            expect(callspy).toHaveBeenCalled();
            expect(callspy.getCall(0).args[0]).toEqual("update");
            expect(callspy.getCall(0).args[1]).toEqual("/rest/v10/me/password");
            expect(callspy.getCall(0).args[2].new_password).toEqual("new");
            expect(callspy.getCall(0).args[2].old_password).toEqual("old");
            callspy.restore();
        });

    });

    describe('Metadata actions', function () {

        it('should log a deprecation warning if old signature is used', function() {
            sinon.collection.stub(this.api, 'call');
            var warnStub = sinon.collection.stub(console, 'warn');

            this.api.getMetadata('hash', '', '', '', '');
            expect(warnStub).toHaveBeenCalled();

            warnStub.reset();

            this.api.getMetadata({});
            expect(warnStub).not.toHaveBeenCalled();
        });

        it('should delegate to the call method', function () {
            var callspy = sinon.spy(this.api, 'call');

            SugarTest.server.respondWith("GET", "/rest/v10/metadata?module_filter=Contacts&module_dependencies=1",
                [200, {  "Content-Type":"application/json"},
                    JSON.stringify(fixtures.metadata.modules.Contacts)]);
            this.api.getMetadata({modules: ['Contacts'], callbacks: this.callbacks});
            SugarTest.server.respond();

            expect(callspy).toHaveBeenCalled();
            expect(callspy.getCall(0).args[1]).toEqual("/rest/v10/metadata?module_filter=Contacts&module_dependencies=1");
            callspy.restore();
        });

        it('should handle options params', function () {
            var callstub = sinon.stub(this.api, 'call');

            this.api.getMetadata({
                modules: ['Contacts'],
                callbacks: this.callbacks,
                params: {lang: 'en_us'},
            });

            expect(callstub).toHaveBeenCalled();
            expect(callstub.getCall(0).args[1]).toEqual("/rest/v10/metadata?lang=en_us&module_filter=Contacts&module_dependencies=1");
            callstub.restore();
        });

        it('should retrieve metadata', function () {
            var modules = ["Contacts"],
                spy = sinon.spy(this.callbacks, 'success');
            //this.api.debug=true;
            SugarTest.server.respondWith("GET", "/rest/v10/metadata?module_filter=Contacts&module_dependencies=1",
                [200, {  "Content-Type":"application/json"},
                    JSON.stringify(fixtures.metadata.modules.Contacts)]);

            this.api.getMetadata({
                modules: modules,
                callbacks: this.callbacks
            });
            SugarTest.server.respond(); //tell server to respond to pending async call

            expect(spy).toHaveBeenCalled();
            expect(spy.getCall(0).args[0]).toEqual(fixtures.metadata.modules.Contacts);
        });

    });

    describe('File actions', function() {

        it("should fetch list of files", function() {
            var spy = sinon.spy(this.callbacks, 'success');

            var response = {
              "filename": {
                "content-type": "application\/pdf",
                "content-length": 64869,
                "name": "10.1.1.56.4713.pdf",
                "uri": "http:\/\/localhost:8888\/sugarcrm\/rest\/v10\/Notes\/1234\/file\/filename"
              }
            };

            var resp = JSON.stringify(response);

            SugarTest.server.respondWith("GET", /\/rest\/v10\/Notes\/1234\/file.*/,
                [200, {  "Content-Type":"application/json"}, resp]);

            this.api.file("read", {
                module: "Notes",
                id: "1234"
            }, null, this.callbacks);
            SugarTest.server.respond();

            expect(spy).toHaveBeenCalled();
            expect(spy.getCall(0).args[0]).toBeDefined();
            expect(spy.getCall(0).args[0].filename).toBeDefined();

        });

        it("should fetch a file", function() {
            var spy = sinon.spy(this.callbacks, 'success');

            SugarTest.server.respondWith("GET", /\/rest\/v10\/Notes\/1234\/file\/filename.*/,
                [200, {  "Content-Type":"application/json"}, "{}"]);

            this.api.file("read", {
                module: "Notes",
                id: "1234",
                field: "filename"
            }, null, this.callbacks);
            SugarTest.server.respond();

            expect(spy).toHaveBeenCalled();
            expect(spy.getCall(0).args[0]).toBeDefined();
        });

        it("should upload files", function() {
            var spy = sinon.spy(this.callbacks, 'success');

            var resp = this.fixtures["rest/v10/Contacts/1/file/picture"].POST.response;
            SugarTest.server.respondWith("POST", /rest\/v10\/Contacts\/1\/file\/picture.*/,
                [200, {  "Content-Type":"application/json"}, JSON.stringify(resp)]);

            this.api.file("create", {
                module: "Contacts",
                id: "1",
                field: "picture"
            }, null, this.callbacks);
            SugarTest.server.respond();
            expect(spy).toHaveBeenCalled();
            expect(spy).toHaveBeenCalledWith(resp);
        });

        it("should delete files", function() {
            var spy = sinon.spy(this.callbacks, 'success');

            var resp = this.fixtures["rest/v10/Contacts/1/file/picture"].DELETE.response;
            SugarTest.server.respondWith("DELETE", /rest\/v10\/Contacts\/1\/file\/picture.*/,
                [200, {  "Content-Type":"application/json"}, JSON.stringify(resp)]);

            this.api.file("delete", {
                module: "Contacts",
                id: "1",
                field: "picture"
            }, null, this.callbacks);
            SugarTest.server.respond();
            expect(spy).toHaveBeenCalled();
            expect(spy).toHaveBeenCalledWith(resp);
        });

        it("should upload temporary files", function() {
            var spy = sinon.spy(this.callbacks, 'success');

            var resp = this.fixtures["rest/v10/Contacts/temp/file/picture"].POST.response;
            SugarTest.server.respondWith("POST", /rest\/v10\/Contacts\/temp\/file\/picture.*/,
                [200, {  "Content-Type":"application/json"}, JSON.stringify(resp)]);

            this.api.file("create", {
                module: "Contacts",
                id: "temp",
                field: "picture"
            }, null, this.callbacks);
            SugarTest.server.respond();
            expect(spy).toHaveBeenCalled();
            expect(spy).toHaveBeenCalledWith(resp);
        });

        it("should retrieve a temporary file", function() {
            var spy = sinon.spy(this.callbacks, 'success');

            var resp = this.fixtures["rest/v10/Contacts/temp/file/picture/1"].GET.response;
            SugarTest.server.respondWith("GET", /rest\/v10\/Contacts\/temp\/file\/picture\/1.*/,
                [200, {  "Content-Type":"application/json"}, JSON.stringify(resp)]);

            this.api.file("read", {
                module: "Contacts",
                id: "temp",
                field: "picture",
                fileId: "1"
            }, null, this.callbacks);
            SugarTest.server.respond();
            expect(spy).toHaveBeenCalled();
            expect(spy).toHaveBeenCalledWith(resp);
        });

    });

    describe('Misc actions', function() {

        it("should fetch server info", function() {
            var spy = sinon.spy(this.callbacks, 'success');

            SugarTest.server.respondWith("GET", /\/rest\/v10\/ServerInfo.*/,
                [200, {  "Content-Type":"application/json"},
                    JSON.stringify({
                      "flavor": "ENT",
                      "version": "6.6"
                    })
                ]);

            this.api.info(this.callbacks);
            SugarTest.server.respond();

            expect(spy).toHaveBeenCalled();
            expect(spy.getCall(0).args[0]).toBeDefined();
        });

        it('should ping server', function() {
            var spy = sinon.spy(this.callbacks, 'success');

            SugarTest.server.respondWith('GET', /.*\/rest\/v10\/ping/,
                [200, { 'Content-Type': 'application/json'}, '']);

            this.api.ping(null, this.callbacks);
            SugarTest.server.respond();

            expect(spy).toHaveBeenCalled();
        });

        it('should ping server with an action', function() {
            var spy = sinon.spy(this.callbacks, 'success');

            SugarTest.server.respondWith('GET', /.*\/rest\/v10\/ping\/some_action/,
                [200, { 'Content-Type': 'application/json'}, '']);

            this.api.ping('some_action', this.callbacks);
            SugarTest.server.respond();

            expect(spy).toHaveBeenCalled();
        });

    });

    describe("Authentication", function() {

        it("should be able to detect when to refresh auth token", function() {
            this.api.setRefreshingToken(true);
            expect(this.api.needRefreshAuthToken()).toBeFalsy();

            this.api.setRefreshingToken(false);
            expect(this.api.needRefreshAuthToken("/rest/v10/Accounts/xyz", "need_login")).toBeFalsy();
            expect(this.api.needRefreshAuthToken("Accounts/xyz", "conflict")).toBeFalsy();
            expect(this.api.needRefreshAuthToken("/rest/v10/oauth2/token", "invalid_grant")).toBeFalsy();
            expect(this.api.needRefreshAuthToken("http://localhost:8888/sugarcrm/rest/v10/oauth2/logout", "invalid_grant")).toBeFalsy();
            expect(this.api.needRefreshAuthToken("http://localhost:8888/sugarcrm/rest/v10/Contacts", "invalid_grant")).toBeTruthy();
            expect(this.api.needRefreshAuthToken("../sugarcrm/rest/v10/search", "invalid_grant")).toBeTruthy();
        });

        it('should login users with correct credentials', function () {
            var spy = sinon.spy(this.callbacks, 'success'),
                sspy = sinon.spy(SugarTest.keyValueStore, 'set'),
                requestBody,
                extraInfo = {
                    "uuid":"xyz",
                    "model":"iPhone3,1",
                    "osVersion":"5.0.1",
                    "carrier":"att",
                    "appVersion":"SugarMobile 1.0",
                    "ismobile":true
                };

            SugarTest.server.respondWith("POST", "/rest/v10/oauth2/token?platform=",
                [200, {  "Content-Type":"application/json"},
                    JSON.stringify(this.fixtures["/rest/v10/oauth2/token"].POST.response)]);

            this.api.login({ username: "admin", password: "password" }, extraInfo, this.callbacks);
            SugarTest.server.respond();

            expect(spy).toHaveBeenCalled();
            expect(spy.getCall(0).args[0]).toEqual(this.fixtures["/rest/v10/oauth2/token"].POST.response);

            expect(this.api.isAuthenticated()).toBeTruthy();
            expect(SugarTest.storage["AuthAccessToken"]).toEqual("55000555");
            expect(SugarTest.storage["AuthRefreshToken"]).toEqual("abc");
            expect(SugarTest.storage["DownloadToken"]).toEqual("qwerty");
            expect(sspy).toHaveBeenCalled();

            requestBody = JSON.parse(SugarTest.server.requests[0].requestBody);
            expect(requestBody['client_info']).toBeDefined();
            expect(requestBody['client_info'].uuid).toEqual(extraInfo.uuid);
            expect(requestBody.username).toEqual('admin');
        });

        it('should not login users with incorrect credentials', function () {
            var spy = sinon.spy(this.callbacks, 'error'),
                sspy = sinon.spy(SugarTest.keyValueStore, 'cut');

            var response = {"error": "need_login", "error_description": "some desc"};
            SugarTest.server.respondWith("POST", /.*\/oauth2\/token.*/,
                [401, {  "Content-Type":"application/json"}, JSON.stringify(response) ]);

            var request = this.api.login({ username:"invalid", password:"invalid" }, null, this.callbacks);
            var rspy = sinon.spy(request, "execute");

            SugarTest.server.respond();

            expect(spy).toHaveBeenCalled();
            expect(spy.getCall(0).args[0].status).toEqual(401);
            expect(spy.getCall(0).args[0].code).toEqual("need_login");

            expect(this.api.isAuthenticated()).toBeFalsy();
            expect(SugarTest.storage["AuthAccessToken"]).toBeUndefined();
            expect(SugarTest.storage["AuthRefreshToken"]).toBeUndefined();
            expect(SugarTest.storage["DownloadToken"]).toBeUndefined();
            expect(sspy).toHaveBeenCalledThrice();
            // this spy is created after the method gets called
            // so, this assertion means that 'executes' is not called the second time
            expect(rspy).not.toHaveBeenCalled();
        });


        it("should attempt refresh in case of invalid_grant response", function() {
            SugarTest.storage.AuthAccessToken = "xyz"; //55000555
            SugarTest.storage.AuthRefreshToken = "qwe";

            var sspy = sinon.spy(this.callbacks, "success");
            var cspy = sinon.spy(this.callbacks, "complete");
            var espy = sinon.spy(this.callbacks, "error");
            var response = {"error": "invalid_grant", "error_description": "some desc"};

            var authed = false;
            var self = this;
            var num = 0;
            SugarTest.server.respondWith(function(xhr) {
                if (num > 2) throw new Error("Too many requests. Possible infinite loop");
                var status, responseText;
                if (xhr.url.indexOf("oauth2") > -1) {
                    status = 200;
                    responseText = JSON.stringify(self.fixtures["/rest/v10/oauth2/token"].POST.response);
                    authed = true;
                }
                else if (authed) {
                    status = 200;
                    responseText = JSON.stringify({});
                }
                else {
                    status = 401;
                    responseText = JSON.stringify(response);
                }
                xhr.respond(status, {"Content-Type": "application/json"}, responseText);
            });

            var request = this.api.records("read", "Accounts", null, null, this.callbacks);
            var rspy = sinon.spy(request, "execute");

            SugarTest.server.respond();

            expect(SugarTest.storage.AuthAccessToken).toEqual("55000555");
            expect(SugarTest.storage.AuthRefreshToken).toEqual("abc");
            expect(rspy).toHaveBeenCalledOnce();
            expect(cspy).toHaveBeenCalledOnce();
            expect(espy).not.toHaveBeenCalled();
            expect(sspy).toHaveBeenCalledOnce();
        });

        it("should handle multiple requests and refresh token in case of invalid_grant response", function() {
            SugarTest.storage.AuthAccessToken = "xyz"; //55000555
            SugarTest.storage.AuthRefreshToken = "qwe";

            var sspy = sinon.spy(this.callbacks, "success");
            var cspy = sinon.spy(this.callbacks, "complete");
            var espy = sinon.spy(this.callbacks, "error");
            var response = {"error": "invalid_grant", "error_description": "some desc"};

            var authed = false;
            var self = this;
            var num = 0;
            SugarTest.server.respondWith(function(xhr) {
                if (++num > 7) throw new Error("Too many requests. Possible infinite loop");
                var status, responseText;
                if (xhr.url.indexOf("oauth2") > -1) {
                    status = 200;
                    responseText = JSON.stringify(self.fixtures["/rest/v10/oauth2/token"].POST.response);
                    authed = true;
                }
                else if (authed) {
                    status = 200;
                    responseText = JSON.stringify({});
                }
                else {
                    status = 401;
                    responseText = JSON.stringify(response);
                }
                xhr.respond(status, {"Content-Type": "application/json"}, responseText);
            });

            var request = this.api.records("read", "Accounts", null, null, this.callbacks);
            var rspy = sinon.spy(request, "execute");
            var request2 = this.api.records("read", "Cases", null, null, this.callbacks);
            var rspy2 = sinon.spy(request2, "execute");
            var request3 = this.api.records("read", "Opportunities", null, null, this.callbacks);
            var rspy3 = sinon.spy(request3, "execute");

            SugarTest.server.respond();

            expect(SugarTest.storage.AuthAccessToken).toEqual("55000555");
            expect(SugarTest.storage.AuthRefreshToken).toEqual("abc");
            expect(rspy).toHaveBeenCalledOnce();
            expect(rspy2).toHaveBeenCalledOnce();
            expect(rspy3).toHaveBeenCalledOnce();
            expect(cspy.callCount).toEqual(3);
            expect(espy).not.toHaveBeenCalled();
            expect(sspy.callCount).toEqual(3);
        });

        it("should pass error to original callback in case of invalid_grant response happens and the original request fails", function() {
            SugarTest.storage.AuthAccessToken = "xyz"; //55000555
            SugarTest.storage.AuthRefreshToken = "qwe";

            var espy = sinon.spy(this.callbacks, "error");
            var cspy = sinon.spy(this.callbacks, "complete");
            var sspy = sinon.spy(this.callbacks, "success");
            var response = {"error": "invalid_grant", "error_description": "some desc"};

            var authed = false;
            var self = this;
            var num = 0;
            SugarTest.server.respondWith(function(xhr) {
                if (num > 2) throw new Error("Too many requests. Possible infinite loop");
                var status, responseText;
                if (xhr.url.indexOf("oauth2") > -1) {
                    status = 200;
                    responseText = JSON.stringify(self.fixtures["/rest/v10/oauth2/token"].POST.response);
                    authed = true;
                }
                else if (authed) {
                    status = 404;
                    responseText = JSON.stringify({});
                }
                else {
                    status = 401;
                    responseText = JSON.stringify(response);
                }
                num++;
                xhr.respond(status, {"Content-Type": "application/json"}, responseText);
            });

            var request = this.api.records("read", "Accounts", null, null, this.callbacks);
            var rspy = sinon.spy(request, "execute");

            SugarTest.server.respond();

            expect(SugarTest.storage.AuthAccessToken).toEqual("55000555");
            expect(SugarTest.storage.AuthRefreshToken).toEqual("abc");
            expect(rspy).toHaveBeenCalledOnce();
            expect(espy).toHaveBeenCalledOnce();
            expect(cspy).toHaveBeenCalledOnce();
            expect(sspy).not.toHaveBeenCalled();
            expect(this.httpError).not.toBeNull();
            expect(this.httpError.status).toEqual(404);
        });

        it("should stop refreshing in case of invalid_grant response happens more than once in a row", function() {
            SugarTest.storage.AuthAccessToken = "xyz"; //55000555
            SugarTest.storage.AuthRefreshToken = "qwe";

            var espy = sinon.spy(this.callbacks, "error");
            var cspy = sinon.spy(this.callbacks, "complete");
            var sspy = sinon.spy(this.callbacks, "success");
            var response = {"error": "invalid_grant", "error_description": "some desc"};

            var num = 0;
            SugarTest.server.respondWith(function(xhr) {
                if (num > 2) throw new Error("Too many requests. Possible infinite loop");
                var status = 401;
                var responseText = JSON.stringify(response);
                num++;
                xhr.respond(status, {"Content-Type": "application/json"}, responseText);
            });

            var request = this.api.records("read", "Accounts", null, null, this.callbacks);
            var rspy = sinon.spy(request, "execute");

            SugarTest.server.respond();

            expect(SugarTest.storage.AuthAccessToken).toBeUndefined();
            expect(SugarTest.storage.AuthRefreshToken).toBeUndefined();
            expect(rspy).not.toHaveBeenCalled();
            expect(espy).toHaveBeenCalledOnce();
            expect(cspy).toHaveBeenCalledOnce();
            expect(sspy).not.toHaveBeenCalled();
            expect(this.httpError).not.toBeNull();
            expect(this.httpError.status).toEqual(401);
        });

        it("should handle multiple requests and stop refreshing in case of invalid_grant response happens more than once in a row", function() {
            SugarTest.storage.AuthAccessToken = "xyz"; //55000555
            SugarTest.storage.AuthRefreshToken = "qwe";

            var espy = sinon.spy(this.callbacks, "error");
            var cspy = sinon.spy(this.callbacks, "complete");
            var sspy = sinon.spy(this.callbacks, "success");
            var response = {"error": "invalid_grant", "error_description": "some desc"};

            var num = 0;
            SugarTest.server.respondWith(function(xhr) {
                if (++num > 4) throw new Error("Too many requests. Possible infinite loop");
                var status = 401;
                var responseText = JSON.stringify(response);
                xhr.respond(status, {"Content-Type": "application/json"}, responseText);
            });

            var request = this.api.records("read", "Accounts", null, null, this.callbacks);
            var rspy = sinon.spy(request, "execute");
            var request2 = this.api.records("read", "Contacts", null, null, this.callbacks);
            var rspy2 = sinon.spy(request2, "execute");
            var request3 = this.api.records("read", "Meetings", null, null, this.callbacks);
            var rspy3 = sinon.spy(request3, "execute");

            SugarTest.server.respond();

            expect(SugarTest.storage.AuthAccessToken).toBeUndefined();
            expect(SugarTest.storage.AuthRefreshToken).toBeUndefined();
            expect(rspy).not.toHaveBeenCalled();
            expect(rspy2).not.toHaveBeenCalled();
            expect(rspy3).not.toHaveBeenCalled();
            expect(espy.callCount).toEqual(3);
            expect(cspy.callCount).toEqual(3);
            expect(sspy).not.toHaveBeenCalled();
            expect(this.httpError).not.toBeNull();
            expect(this.httpError.status).toEqual(401);
        });

        it("should not refresh token in case of invalid_grant response happens for auth request", function() {
            SugarTest.storage.AuthAccessToken = "xyz"; //55000555
            SugarTest.storage.AuthRefreshToken = "qwe";

            var espy = sinon.spy(this.callbacks, "error");
            var cspy = sinon.spy(this.callbacks, "complete");
            var sspy = sinon.spy(this.callbacks, "success");
            var response = {"error": "invalid_grant", "error_description": "some desc"};

            SugarTest.server.respondWith(function(xhr) {
                xhr.respond(400, {"Content-Type": "application/json"}, JSON.stringify(response));
            });

            var request = this.api.login({ username: "a", password: "b"}, null, this.callbacks);
            var rspy = sinon.spy(request, "execute");

            SugarTest.server.respond();

            expect(SugarTest.storage.AuthAccessToken).toBeUndefined();
            expect(SugarTest.storage.AuthRefreshToken).toBeUndefined();
            expect(rspy).not.toHaveBeenCalled();
            expect(espy).toHaveBeenCalledOnce();
            expect(cspy).toHaveBeenCalledOnce();
            expect(sspy).not.toHaveBeenCalled();
            expect(this.httpError).not.toBeNull();
            expect(this.httpError.status).toEqual(400);
        });

        it("should not refresh token in case of invalid_grant while retrying queued requests", function() {
            SugarTest.storage.AuthAccessToken = "xyz"; //55000555
            SugarTest.storage.AuthRefreshToken = "qwe";

            var espy = sinon.spy(this.callbacks, "error");
            var cspy = sinon.spy(this.callbacks, "complete");
            var sspy = sinon.spy(this.callbacks, "success");
            var response = {"error": "invalid_grant", "error_description": "some desc"};
            var self = this;

            var num = 0;
            SugarTest.server.respondWith(function(xhr) {
                if (++num > 3) throw new Error("Too many requests. Possible infinite loop");
                //fake a server that fails all non-token requests
                var status = 401;
                var responseText = JSON.stringify(response);
                if (xhr.url.indexOf("oauth2") > -1) {
                    status = 200;
                    responseText = JSON.stringify(self.fixtures["/rest/v10/oauth2/token"].POST.response);
                }
                xhr.respond(status, {"Content-Type": "application/json"}, responseText);
            });

            this.api.records("read", "Accounts", null, null, this.callbacks);

            SugarTest.server.respond();

            expect(SugarTest.storage.AuthAccessToken).toBeUndefined();
            expect(SugarTest.storage.AuthRefreshToken).toBeUndefined();
            expect(espy).toHaveBeenCalledOnce();
            expect(cspy).toHaveBeenCalledOnce();
            expect(sspy).not.toHaveBeenCalled();
            expect(this.httpError).not.toBeNull();
            expect(this.httpError.status).toEqual(401);
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
            expect(SugarTest.storage["AuthRefreshToken"]).toBeUndefined();
            expect(SugarTest.storage["DownloadToken"]).toBeUndefined();
            expect(sspy).toHaveBeenCalledThrice();
        });
    });

    describe("HttpError", function() {

        it("should be able properly instantiate itself", function() {
            var xhr = {
                status: 404,
                responseText: "response text",
                getResponseHeader: function() { return "application/json" }
            };

            var error = new SUGAR.Api.HttpError({ xhr: xhr }, "text status", "error thrown");
            expect(error.status).toEqual(404);
            expect(error.responseText).toEqual("response text");
            expect(error.textStatus).toEqual("text status");
            expect(error.errorThrown).toEqual("error thrown");
            expect(error.code).toBeUndefined();
        });

        it("should be able parse error code", function() {
            var xhr, error;
            xhr = {
                status: 401,
                responseText: JSON.stringify({"error": "invalid_grant", "error_message": "some message"}),
                getResponseHeader: function() { return "application/json"; }
            };

            error = new SUGAR.Api.HttpError({ xhr: xhr }, "text status", "error thrown");
            expect(error.status).toEqual(401);
            expect(error.code).toEqual("invalid_grant");
            expect(error.message).toEqual("some message");

            xhr = {
                status: 500,
                responseText: "Something really bad happened",
                getResponseHeader: function() { return "text/html; charset=iso-8859-1"; }
            };

            error = new SUGAR.Api.HttpError({ xhr: xhr }, "text status", "error thrown");
            expect(error.status).toEqual(500);
            expect(error.code).toBeUndefined();
            expect(error.description).toBeUndefined();
        });

    });

    describe("HttpRequest", function() {

        it("should be able to set oauth header before executing ajax request", function() {
            var request, spy = sinon.spy($, 'ajax');
            request = new SUGAR.Api.HttpRequest({});

            request.execute("xyz");
            expect(request.params.headers["OAuth-Token"]).toEqual("xyz");
            expect(spy).toHaveBeenCalled();
            expect(request.xhr).toBeDefined();
            spy.restore();
        });

        it("should count the number of current requests", function() {
            var request, spy = sinon.spy($, 'ajax');
            request = new SUGAR.Api.HttpRequest({});
            expect(SUGAR.Api.getCallsInProgressCount()).toBe(0);
            request.execute("xyz");
            expect(SUGAR.Api.getCallsInProgressCount()).toBe(1);
            SugarTest.server.respond();
            expect(SUGAR.Api.getCallsInProgressCount()).toBe(0);
            spy.restore();
        });

    });

    describe("Hash of requests", function() {

        it("should clean hash of requests", function() {

            var cspy = sinon.stub(this.callbacks, "complete", function() {
                SugarTest.setWaitFlag();
            });

            SugarTest.server.respondWith(function(xhr) {
                xhr.respond(200, {"Content-Type": "application/json"}, JSON.stringify({}));
            });

            var request = this.api.records("read", "Accounts", null, null, this.callbacks);

            expect(this.api.getRequest(request.uid)).toBeDefined();

            SugarTest.server.respond();

            SugarTest.wait();

            runs(function(){
                expect(this.api.getRequest(request.uid)).toBeNull();
            })
        });

        it("should abort request by id", function() {

            var cspy = sinon.stub(this.callbacks, "complete", function(xhr, status) {

                expect(request.aborted).toBeTruthy();

                SugarTest.setWaitFlag();
            });

            SugarTest.server.respondWith(function(xhr) {
                xhr.respond(200, {"Content-Type": "application/json"}, JSON.stringify({}));
            });

            var request = this.api.records("read", "Accounts", null, null, this.callbacks);

            expect(this.api.getRequest(request.uid)).toBeDefined();

            this.api.abortRequest(request.uid);

            SugarTest.server.respond();

        });

    });

    describe("Bulk Requests", function() {
        it("should queue rather than call when bulk is set to an ID", function() {
            var ajaxStub = sinon.spy($, 'ajax');
            SugarTest.server.respondWith(function(xhr) {
                xhr.respond(200, {"Content-Type": "application/json"}, JSON.stringify({}));
            });
            this.api.call("read", "/rest/v10/ping", null, null, {bulk:true});
            expect(ajaxStub.called).toBeFalsy();

            ajaxStub.restore();
            this.api.clearBulkQueue();
        });

        it("should queue hit the bulk API endpoint", function() {
            this.api.clearBulkQueue();
            SugarTest.server.respondWith(function(xhr) {
                if (xhr.url == "/rest/v10/bulk") {
                    xhr.respond(200, {"Content-Type": "application/json"}, JSON.stringify([{
                        contents: "pong",
                        headers: {},
                        status: 200
                    }]));
                } else {
                    xhr.respond(404, {"Content-Type": "application/json"}, "");
                }
            });
            var response = "";
            this.api.call("read", "/rest/v10/ping", null, {success:function(o){
               response = o;
            }}, {bulk:true});
            this.api.triggerBulkCall();
            SugarTest.server.respond();

            expect(response).toEqual("pong");
        });

        it("should return a valid xhr object", function() {
            this.api.clearBulkQueue();
            SugarTest.server.respondWith(function(xhr) {
                if (xhr.url == "/rest/v10/bulk") {
                    xhr.respond(200, {"Content-Type": "application/json"}, JSON.stringify([{
                        contents: "pong",
                        headers: {
                            "Cache-Control": "max-age=0, private",
                            "ETag": "28b71fa23e3bb1239251291fd518610b"
                        },
                        status: 200,
                        status_text: "OK"
                    }]));
                } else {
                    xhr.respond(404, {"Content-Type": "application/json"}, "");
                }
            });
            var response = "",
                eTag = "",
                allHeaders = "",
                complete = false;
            this.api.call("read", "/rest/v10/ping", null, {
                success: function(o, req) {
                    response = o;
                    eTag = req.xhr.getResponseHeader("ETag");
                    allHeaders = req.xhr.getAllResponseHeaders();
                    expect(req.xhr.status).toEqual(200);
                    expect(req.xhr.statusText).toEqual("OK");
                    expect(req.xhr.responseText).toEqual("pong");
                    expect(req.xhr.readyState).toEqual(4);
                },
                complete: function(req) {
                    complete = true;
                    expect(req.status).toEqual("success");
                }
            }, {bulk: true});
            this.api.triggerBulkCall();
            SugarTest.server.respond();

            expect(response).toEqual("pong");
            expect(eTag).toEqual("28b71fa23e3bb1239251291fd518610b");
            expect(allHeaders).toEqual("Cache-Control: max-age=0, private\nETag: 28b71fa23e3bb1239251291fd518610b\n");
            expect(complete).toBeTruthy();
        });

        it("should pass errors through to the request error handler", function() {
            this.api.clearBulkQueue();
            var payload = {
                error: "no_method",
                error_message: "Could not find a route with 1 elements"
            };
            SugarTest.server.respondWith(function(xhr) {
                if (xhr.url == "/rest/v10/bulk") {
                    xhr.respond(200, {"Content-Type": "application/json"}, JSON.stringify([{
                        contents: payload,
                        headers: {
                            "Cache-Control": "no-store",
                            "Content-Type": "application/json"
                        },
                        status: 404,
                        status_text: "Not Found"
                    }]));
                } else {
                    xhr.respond(500, {"Content-Type": "application/json"}, "");
                }
            });
            var success = false,
                complete = false,
                errorCalled = false;
            this.api.call("read", "/rest/v10/ping", null, {
                success: function(o) {
                    success = true;
                },
                error: function(error) {
                    errorCalled = true;
                    expect(error.code).toEqual("no_method");
                    expect(error.errorThrown).toEqual("Not Found");
                    expect(error.message).toEqual("Could not find a route with 1 elements");
                    expect(error.status).toEqual(404);
                    expect(error.textStatus).toEqual("error");
                    expect(error.payload).toEqual(payload);
                    expect(error.request.xhr.status).toEqual(404);
                    expect(error.request.xhr.responseText).toEqual(JSON.stringify(payload));
                    expect(error.request.xhr.statusText).toEqual("Not Found");
                },
                complete: function(req) {
                    complete = true;
                    expect(req.status).toEqual("error");
                }
            }, {bulk: true});
            this.api.triggerBulkCall();
            SugarTest.server.respond();

            expect(success).toBeFalsy();
            expect(errorCalled).toBeTruthy();
            expect(complete).toBeTruthy();
        });
    });
});
