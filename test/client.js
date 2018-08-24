/*
 * Copyright (c) 2017 SugarCRM Inc. Licensed by SugarCRM under the Apache 2.0 license.
 */

const Api = require('../src/client');

describe('Instantiation', function () {

    beforeEach(function () {
        this.sandbox = sinon.sandbox.create();

        this.storage = {
            get() {},
            set() {},
            cut() {},
        };
    });

    it('should default to `/rest/v10` and not be authenticated', function () {

        let api = Api.createInstance();

        expect(api.serverUrl).toEqual('/rest/v10');
        expect(api.isAuthenticated()).toBeFalsy();
    });

    it('should assume to be authenticated if storage has `AuthAccessToken`', function () {

        let getStub = this.sandbox.stub(this.storage, 'get')
            .withArgs('AuthAccessToken').returns('xyz');

        let api = Api.createInstance({
            keyValueStore: this.storage,
        });

        expect(api.isAuthenticated()).toBeTruthy();
        expect(getStub).toHaveBeenCalled();
    });

    it('should throw error when store is invalid', function () {

        const err = 'Failed to initialize Sugar API: key/value store provider is invalid';

        expect(function() {
            Api.createInstance({ keyValueStore: {} });
        }).toThrow(err);

        expect(function() {
            Api.createInstance({ keyValueStore: {
                // no get
                set() {},
                cut() {},
            } });
        }).toThrow(err);

        expect(function() {
            Api.createInstance({ keyValueStore: {
                get() {},
                // no set
                cut() {},
            } });
        }).toThrow(err);

        expect(function() {
            Api.createInstance({ keyValueStore: {
                get() {},
                set() {},
                // no cut
            } });
        }).toThrow(err);

    });

    it('should initialize asynchronously if keyValueStore has initAsync', function () {

        let storage = _.clone(this.storage);
        storage.initAsync = sinon.spy();

        Api.createInstance({ keyValueStore: storage });
        expect(storage.initAsync).toHaveBeenCalled();
    });

});

describe('Api client', function () {

    beforeEach(function () {

        this.sandbox = sinon.sandbox.create();

        if (window.crosstab) {
            this.crosstabSupport = crosstab.supported;
            crosstab.supported = false;
        }

        this.storage = {
            get() {},
            set() {},
            cut() {},
        };

        this.api = Api.createInstance({
            serverUrl: '/rest/v10',
            keyValueStore: this.storage,
        });

        this.fixtures = require('./fixtures/api.js');
        let metadata = require('./fixtures/metadata.js').metadata;
        this.fixtures.metadata = metadata;
        this.fixtures.fields = metadata.fields;

        this.server = sinon.fakeServer.create();

        this.callbacks = {
            success:function (data) {},
            error:function (error) {},
            complete: function() {}
        };

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

        if (window.crosstab) {
            crosstab.supported = this.crosstabSupport;
        }

        this.server.restore();
    });

    describe('Fallback Error Handler', function () {

        it('should create instance taking an "on error" fallback http handler', function () {
            var stubHttpErrorHandler = sinon.stub(),
                api = Api.createInstance({
                    defaultErrorHandler: stubHttpErrorHandler
                });
            expect(api.defaultErrorHandler).toEqual(stubHttpErrorHandler);
        });

        it("should use default fallback http handler", function() {
            var stubHttpErrorHandler = sinon.stub(),
                api = Api.createInstance({
                    defaultErrorHandler: stubHttpErrorHandler
                });
            var response = {"error": "invalid_grant", "error_description": "some desc"};
            this.server.respondWith(function(xhr) {
                var status = 401,
                    responseText = JSON.stringify(response);
                xhr.respond(status, {"Content-Type": "application/json"}, responseText);
            });

            api.call('create', '/rest/v10/oauth2/token');
            this.server.respond();
            expect(stubHttpErrorHandler).toHaveBeenCalled();
        });

        it("should favor callback.error over the default fallback http handler", function() {
            var stubHttpErrorHandler = sinon.stub(),
                callbackError = sinon.stub(),
                api = Api.createInstance({
                    defaultErrorHandler: stubHttpErrorHandler
                });
            var response = {"error": "invalid_grant", "error_description": "some desc"};
            this.server.respondWith(function(xhr) {
                var status = 401,
                    responseText = JSON.stringify(response);
                xhr.respond(status, {"Content-Type": "application/json"}, responseText);
            });

            api.call('create', '/rest/v10/oauth2/token', null, {error: callbackError});
            this.server.respond();
            expect(callbackError).toHaveBeenCalled();
            expect(stubHttpErrorHandler).not.toHaveBeenCalled();
        });
    });

    describe('Request Handler', function () {

        it('should make a request with the correct request url', function () {

            let xhr = this.sandbox.useFakeXMLHttpRequest();

            this.api.call('read', '/rest/v10/contact', {
                date_modified: '2012-02-08 19:18:25'
            });

            expect(xhr.requests[0].url).toEqual('/rest/v10/contact');
            expect(xhr.requests[0].requestHeaders['If-Modified-Since']).toBeUndefined();

        });

        it('should set the right method on request', function () {
            var spy = sinon.spy($, 'ajax'), args;

            //@arguments: method, URL, options
            this.api.call('update', '/rest/v10/contacts');
            this.server.respond(); //Must respond to prevent hanging requests.

            // Spy was called
            expect(spy).toHaveBeenCalled();

            args = spy.getCall(0).args[0];
            expect(args.type).toEqual("PUT");
            expect(args.headers["If-Modified-Since"]).toBeUndefined();
            spy.restore();
        });

        it('should not set oauth header for auth requests', function () {
            var spy = sinon.spy($, 'ajax'), args;

            this.api.call('create', '/rest/v10/oauth2/token');
            this.server.respond();

            expect(spy).toHaveBeenCalled();
            args = spy.getCall(0).args[0];
            expect(args.headers["OAuth-Token"]).toBeUndefined();
            spy.restore();
        });

        it('should set the right options on request', function () {
            var spy = sinon.spy($, 'ajax'), args;

            //@arguments: method, URL, options
            this.api.call('read', '/rest/v10/contacts', null, null, {async:true});
            this.server.respond(); //Must respond to prevent hanging requests.

            // Spy was called
            expect(spy).toHaveBeenCalled();

            args = spy.getCall(0).args[0];
            expect(args.async).toBeTruthy();
            expect(args.headers["If-Modified-Since"]).toBeUndefined();
            spy.restore();
        });

        it('should handle successful responses', function () {
            var aContact = this.fixtures["rest/v10/contact"].GET.response.records[1],
                uri = "/rest/v10/Contacts/1234",
                result;

            this.server.respondWith("GET", uri,
                [200, {  "Content-Type":"application/json"},
                    JSON.stringify(aContact)]);
            result = this.api.call('read', uri, null, null, this.callbacks);
            this.server.respond();

            expect(result.xhr.responseText).toEqual(JSON.stringify(aContact));
        });

        it('should fire error callbacks and return requests objects on error', function () {

            this.server.respondWith("GET", "rest/v10/contacts/123",
                [this.fixtures.responseErrors.fourhundred.code, { "Content-Type":"application/json" },
                    this.fixtures.responseErrors.fourhundred.body]);
            var result = this.api.call('read', 'rest/v10/contacts/123', null, null, this.callbacks);

            this.server.respond(); //tell server to respond to pending async call

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

        describe('buildFileURL', function() {
            let attributes = {module: 'Notes', id: 'note_id', field: 'fileField'};

            it('should build resource URLs', function () {
                let url = this.api.buildFileURL(attributes);
                let options;

                expect(url).toEqual('/rest/v10/Notes/note_id/file/fileField?format=sugar-html-json');

                options = {platform: "base"};
                url = this.api.buildFileURL(attributes, options);
                expect(url).toEqual('/rest/v10/Notes/note_id/file/fileField?format=sugar-html-json&platform=base');

                options = {htmlJsonFormat: false};
                url = this.api.buildFileURL(attributes, options);
                expect(url).toEqual('/rest/v10/Notes/note_id/file/fileField');

                attributes = {module: 'Notes', id: 'note_id'};
                url = this.api.buildFileURL(attributes, options);
                expect(url).toEqual('/rest/v10/Notes/note_id/file');

                options = {platform: 'mobile'};
                url = this.api.buildFileURL(attributes, options);
                expect(url).toEqual('/rest/v10/Notes/note_id/file?platform=mobile');

                options = {htmlJsonFormat: false};
                url = this.api.buildFileURL(attributes, options);
                expect(url).toEqual('/rest/v10/Notes/note_id/file');

                options = {htmlJsonFormat: false, forceDownload: true};
                url = this.api.buildFileURL(attributes, options);
                expect(url).toEqual('/rest/v10/Notes/note_id/file?force_download=1');

                options = {htmlJsonFormat: false, forceDownload: false};
                url = this.api.buildFileURL(attributes, options);
                expect(url).toEqual('/rest/v10/Notes/note_id/file?force_download=0');

                options = {keep: true};
                url = this.api.buildFileURL(attributes, options);
                expect(url).toEqual('/rest/v10/Notes/note_id/file?keep=1');

                //cleanCache url
                options = {cleanCache: true};
                url = this.api.buildFileURL(attributes, options);
                var clock = sinon.useFakeTimers();
                var nextUrl = this.api.buildFileURL(attributes, options);
                expect(url).not.toBe(nextUrl);
                clock.restore();
            });

            it('should never include OAuth tokens in the URL even if passOAuthToken is requested', function() {
                this.sandbox.stub(this.storage, 'get')
                    .withArgs('AuthAccessToken')
                    .returns('this-should-be-secret');

                let url = this.api.buildFileURL(attributes, {passOAuthToken: true});

                expect(url).toEqual('/rest/v10/Notes/note_id/file');

            });

            it('should allow passing download token on URL', function() {

                this.sandbox.stub(this.storage, 'get')
                    .withArgs('DownloadToken').returns('token-to-download');

                let url = this.api.buildFileURL(attributes, { passDownloadToken: true });

                expect(url).toEqual('/rest/v10/Notes/note_id/file?download_token=token-to-download');

            });

            it('should fall back to _platform set on instantiation if no platform arg is passed', function () {
                let api = Api.createInstance({
                    platform: 'my-platform',
                });
                let url = api.buildFileURL(attributes, {});
                expect(url).toEqual('/rest/v10/Notes/note_id/file?platform=my-platform')
            });
        });

        it('should build resource URLs to access the Export API', function() {
            this.server.respondWith("POST", "/rest/v10/Accounts/record_list",
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

            this.server.respond(); //tell server to respond to pending async call

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

        it('should build resource URL for fetching a collection field', function() {
            let params = {module_list: 'Contacts,Leads,Users', offset: {contacts: 1, users: 2, leads: 2}};
            let attributes = {id: 'foobarbaz', field: 'invitees'};
            let url = this.api.buildURL('Calls', 'collection', attributes, params);

            expect(url).toEqual('/rest/v10/Calls/foobarbaz/collection/invitees?module_list=Contacts%2CLeads%2CUsers&offset%5Bcontacts%5D=1&offset%5Busers%5D=2&offset%5Bleads%5D=2');
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

            this.server.respondWith("GET", "/rest/v10/Bugs/enum/fixed_in_release",
                [200, {  "Content-Type":"application/json"}, JSON.stringify(options)]);

            var request = this.api.enumOptions(module, field, this.callbacks);
            this.server.respond();

            expect(spy).toHaveBeenCalledWith(options, request);
            expect(apispy.getCall(0).args[1]).toContain("Bugs/enum/fixed_in_release");
            spy.restore();
            apispy.restore();
        });
    });

    describe('Collection API', function() {
        it('should fetch collection field records', function() {
            let spy = sinon.spy(this.callbacks, 'success');
            let module = 'Contacts';
            let records = this.fixtures["rest/v10/contact"].GET.response.records;
            let data = {id: 'foobarbaz', field: 'collectionFieldName'};

            this.server.respondWith('GET', '/rest/v10/Contacts/foobarbaz/collection/collectionFieldName',
                [200, {'Content-Type': 'application/json'}, JSON.stringify(records)]);

            var request = this.api.collection(module, data, null, this.callbacks);
            this.server.respond();

            expect(spy).toHaveBeenCalledOnce();
            expect(spy).toHaveBeenCalledWith(records);
            spy.restore();
        });
    });

    describe('Record CRUD actions', function () {

        it('search a module', function () {
            var spy = sinon.spy(this.callbacks, 'success'),
                modules = "Contacts, Bugs, Leads",
                query = "bob",
                recordOne = this.fixtures["rest/v10/contact"].GET.response.records[1],
                fields = "first_name,last_name";
                this.server.respondWith("GET", /.*\/rest\/v10\/globalsearch\?.*q=bob/,
                [200, {  "Content-Type":"application/json"},
                    JSON.stringify(recordOne)]);

            this.api.search({q:query, module_list: modules, fields: fields, max_num:20}, this.callbacks, {useNewApi: true});
            this.server.respond();
            expect(spy).toHaveBeenCalledOnce();
            expect(spy).toHaveBeenCalledWith(recordOne);
            spy.restore();
        });

        it('should get the count', function () {
            let spy = sinon.spy(this.callbacks, 'success');
            let module = 'Contacts';

            this.server.respondWith('GET', '/rest/v10/Contacts/count',
                [200, { 'Content-Type': 'application/json' }, '']);

            let request = this.api.count(module, {}, this.callbacks);
            this.server.respond();

            expect(spy).toHaveBeenCalledWith(null, request);
            spy.restore();
        });

        it('should get a record', function () {
            var spy = sinon.spy(this.callbacks, 'success'),
                attributes = {id:"1234", date_modified: "2012-02-08 19:18:25"},
                recordOne = this.fixtures["rest/v10/contact"].GET.response.records[1];

            this.server.respondWith("GET", "/rest/v10/Contacts/1234",
                [200, {  "Content-Type":"application/json"},
                    JSON.stringify(recordOne)]);

            this.api.records("read", "Contacts", attributes, null, this.callbacks);
            this.server.respond();

            expect(spy).toHaveBeenCalled();
            expect(spy.getCall(0).args[0]).toEqual(recordOne);
            expect(this.server.requests[0].requestHeaders["If-Modified-Since"]).toBeUndefined();
            spy.restore();
        });

        it('should create record', function () {
            var spy = sinon.spy(this.callbacks, 'success'),
                module = "Contacts", params = "", req = null,
                attributes = {first_name:"Ronald", last_name:"McDonald", phone_work:"0980987", description:"This dude is cool."},
                postResponse = this.fixtures["rest/v10/contact"].POST.response;

            this.server.respondWith("POST", "/rest/v10/Contacts",
                [200, {  "Content-Type":"application/json"},
                    JSON.stringify(postResponse)]);

            this.api.records("create", module, attributes, params, this.callbacks);
            this.server.respond();

            expect(spy).toHaveBeenCalled();
            expect(spy.getCall(0).args[0]).toEqual(postResponse);
            req = this.server.requests[0];
            expect(req.responseText).toMatch(/^\{.guid/);
            expect(req.requestBody).toEqual('{"first_name":"Ronald","last_name":"McDonald","phone_work":"0980987","description":"This dude is cool."}');
            spy.restore();
        });

        it('should get records', function () {
            var spy = sinon.spy(this.callbacks, 'success'),
                module = "Contacts",
                params = "", data = null, req = null, attributes = {},
                records = this.fixtures["rest/v10/contact"].GET.response.records;

            this.server.respondWith("GET", "/rest/v10/Contacts",
                [200, {  "Content-Type":"application/json"},
                    JSON.stringify(records)]);

            this.api.records("read", module, attributes, params, this.callbacks);
            this.server.respond();

            expect(spy).toHaveBeenCalled();
            expect(spy.getCall(0).args[0]).toEqual(records);
            req  = this.server.requests[0];
            expect(req.requestBody).toBeNull();
            data = JSON.parse(req.responseText);
            expect(data.length).toEqual(2);
            spy.restore();
        });

        it('should update record', function () {
            var module = "Contacts",
                params = "",
                attributes = {first_name:"Ronald", last_name:"McDonald", phone_work:"1234123", description:"This dude is cool."},
                spy = sinon.spy(this.callbacks, 'success'),
                cspy = sinon.spy(this.callbacks, 'complete');

            this.server.respondWith("PUT", "/rest/v10/Contacts",
                [200, {  "Content-Type":"application/json"},
                    ""]);

            var request = this.api.records("update", module, attributes, params, this.callbacks);
            this.server.respond();

            expect(spy).toHaveBeenCalledWith(null, request);
            expect(cspy).toHaveBeenCalledWith(request);
            var req = this.server.requests[0];
            expect(req.requestBody).toEqual(JSON.stringify(attributes));
            spy.restore();
            cspy.restore();
        });

        it('should delete record', function () {
            var spy = sinon.spy(this.callbacks, 'success'),
                module = "Contacts",
                params = "",
                attributes = {id:"1234"};

            this.server.respondWith("DELETE", "/rest/v10/Contacts/1234",
                [200, {  "Content-Type":"application/json"}, ""]);

            var request = this.api.records("delete", module, attributes, params, this.callbacks);
            this.server.respond();

            expect(spy).toHaveBeenCalledWith(null, request);
            expect(spy.getCall(0).args[0]).toEqual(null);
            spy.restore();
        });

        it('should favorite record', function () {
            var spy = sinon.spy(this.callbacks, 'success'),
                module = "Contacts",
                id ="1234";

            this.server.respondWith("PUT", "/rest/v10/Contacts/1234/favorite",
                [200, {  "Content-Type":"application/json"}, ""]);

            var request = this.api.favorite(module, id, true, this.callbacks);
            this.server.respond();

            expect(spy).toHaveBeenCalledWith(null, request);
            spy.restore();
        });

        it('should unfavorite record', function () {
            var spy = sinon.spy(this.callbacks, 'success'),
                module = "Contacts",
                id ="1234";

            this.server.respondWith("PUT", "/rest/v10/Contacts/1234/unfavorite",
                [200, {  "Content-Type":"application/json"}, ""]);

            var request = this.api.favorite(module, id, false, this.callbacks);
            this.server.respond();

            expect(spy).toHaveBeenCalledWith(null, request);
            spy.restore();
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

            this.server.respondWith("GET", "/rest/v10/opportunities/1/link/contacts",
                [200, {  "Content-Type":"application/json"},
                    JSON.stringify(respFixture)]);

            this.api.relationships("read", module, attributes, null, this.callbacks);
            this.server.respond();

            expect(spy.getCall(0).args[0]).toEqual(respFixture);
            data = JSON.parse(this.server.requests[0].responseText);
            expect(data.records.length).toEqual(3);
            expect(data.next_offset).toEqual(2);
            spy.restore();
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

            this.server.respondWith("POST", "/rest/v10/opportunities/1/link/contacts",
                [200, {  "Content-Type":"application/json"},
                    JSON.stringify(fixture)]);

            this.api.relationships("create", module, attributes, null, this.callbacks);

            this.server.respond();

            req = this.server.requests[0];
            expect(JSON.parse(req.requestBody)).toEqual(attributes.related);
            expect(spy.getCall(0).args[0]).toEqual(fixture);
            expect(req.requestBody).toEqual(JSON.stringify(attributes.related));
            record = JSON.parse(req.responseText).record;
            expect(record.name).toEqual(fixture.record.name);
            spy.restore();
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

            this.server.respondWith("PUT", "/rest/v10/opportunities/1/link/contacts/2",
                [200, {  "Content-Type":"application/json"}, JSON.stringify(respFixture)]);

            this.api.relationships("update", module, attributes, null, this.callbacks);

            this.server.respond();
            expect(spy.getCall(0).args[0]).toEqual(respFixture);
            requestBody = this.server.requests[0].requestBody;
            expect(requestBody).toEqual(JSON.stringify(attributes.related));
            spy.restore();
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

            this.server.respondWith("DELETE", "/rest/v10/opportunities/1/link/contacts/2",
                [200, {  "Content-Type":"application/json"}, JSON.stringify(fixture.DELETE.response)]);

            this.api.relationships("delete", module, attributes, null, this.callbacks);

            this.server.respond();
            expect(this.server.requests[0].requestBody).toBeNull();
            expect(spy.getCall(0).args[0]).toEqual(fixture.DELETE.response);
            spy.restore();
        });
    });

    describe('Password', function () {

        it('should verify password', function () {
            var callspy = sinon.spy(this.api, 'call');

            this.server.respondWith("POST", "/rest/v10/me/password",
                [200, {  "Content-Type":"application/json"},
                    JSON.stringify({current_user: {valid: true}})]);
            this.api.verifyPassword("passwordtocheck", null);

            this.server.respond();

            expect(callspy).toHaveBeenCalled();
            expect(callspy.getCall(0).args[0]).toEqual("create");
            expect(callspy.getCall(0).args[1]).toEqual("/rest/v10/me/password");
            expect(callspy.getCall(0).args[2].password_to_verify).toEqual("passwordtocheck");
            callspy.restore();
        });

        it('should update password', function () {
            var callspy = sinon.spy(this.api, 'call');

            this.server.respondWith("PUT", "/rest/v10/me/password",
                [200, {  "Content-Type":"application/json"},
                    JSON.stringify({current_user: {valid: true}})]);
            this.api.updatePassword("old", "new", null);

            this.server.respond();

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

            this.server.respondWith("GET", "/rest/v10/metadata?module_filter=Contacts&module_dependencies=1",
                [200, {  "Content-Type":"application/json"},
                    JSON.stringify(this.fixtures.metadata.modules.Contacts)]);
            this.api.getMetadata({modules: ['Contacts'], callbacks: this.callbacks});
            this.server.respond();

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
            this.server.respondWith("GET", "/rest/v10/metadata?module_filter=Contacts&module_dependencies=1",
                [200, {  "Content-Type":"application/json"},
                    JSON.stringify(this.fixtures.metadata.modules.Contacts)]);

            this.api.getMetadata({
                modules: modules,
                callbacks: this.callbacks
            });
            this.server.respond(); //tell server to respond to pending async call

            expect(spy).toHaveBeenCalled();
            expect(spy.getCall(0).args[0]).toEqual(this.fixtures.metadata.modules.Contacts);
            spy.restore();
        });

        it('should retrieve public metadata', function () {
            let callstub = sinon.stub(this.api, 'call');

            this.api.getMetadata({
                public: true,
            });

            expect(callstub).toHaveBeenCalled();
            expect(callstub.getCall(0).args[1]).toEqual('/rest/v10/metadata/public?module_dependencies=1');
            callstub.restore();
        });
    });

    describe('CSS API', function () {
        it('should request the desired theme for the specified platform', function () {
            let spy = sinon.spy(this.callbacks, 'success');

            this.server.respondWith('GET', '/rest/v10/css?platform=my-platform&themeName=my-theme',
                [200, {'Content-Type': 'text/css'}, '']);

            let request = this.api.css('my-platform', 'my-theme', this.callbacks);
            this.server.respond();

            expect(spy).toHaveBeenCalledWith(null, request);
            spy.restore();
        });
    });

    describe('File actions', function() {

        it('should fetch list of files', function() {

            this.sandbox.stub(this.storage, 'get')
                .withArgs('AuthAccessToken').returns('file-oauth-token');

            let stub = sinon.stub(this.callbacks, 'success');

            let response = {
                filename: {
                    'content-type': 'application/pdf',
                    'content-length': 64869,
                    'name': '10.1.1.56.4713.pdf',
                    'uri': 'http://localhost:8888/sugarcrm/rest/v10/Notes/1234/file/filename',
                },
            };

            let xhr = this.sandbox.useFakeXMLHttpRequest();

            this.api.file('read', {
                module: 'Notes',
                id: '1234'
            }, null, this.callbacks);

            expect(xhr.requests[0].url).toMatch('/rest/v10/Notes/1234/file');
            expect(xhr.requests[0].method).toBe('GET');
            expect(xhr.requests[0].requestHeaders).toEqual(jasmine.objectContaining({
                'OAuth-Token': 'file-oauth-token'
            }));
            xhr.requests[0].respond(200, {  'Content-Type':'application/json'}, JSON.stringify(response));

            expect(stub).toHaveBeenCalledOnce();
            expect(stub).toHaveBeenCalledWith(response);
            stub.restore();
        });

        it('should fetch a file', function() {
            this.sandbox.stub(this.storage, 'get')
                .withArgs('AuthAccessToken').returns('file-oauth-token');

            let stub = sinon.stub(this.callbacks, 'success');

            let xhr = this.sandbox.useFakeXMLHttpRequest();

            this.api.file('read', {
                module: 'Notes',
                id: '1234',
                field: 'filename'
            }, null, this.callbacks);

            expect(xhr.requests[0].url).toMatch('/rest/v10/Notes/1234/file');
            expect(xhr.requests[0].method).toBe('GET');
            expect(xhr.requests[0].requestHeaders).toEqual(jasmine.objectContaining({
                'OAuth-Token': 'file-oauth-token'
            }));
            xhr.requests[0].respond(200, {  'Content-Type':'application/json'}, '{}');

            expect(stub).toHaveBeenCalledOnce();
            expect(stub).toHaveBeenCalledWith({});
            stub.restore();
        });

        it('should upload files', function() {
            this.sandbox.stub(this.storage, 'get')
                .withArgs('AuthAccessToken').returns('file-oauth-token');

            let stub = sinon.stub(this.callbacks, 'success');

            let xhr = this.sandbox.useFakeXMLHttpRequest();

            const fileObject = new Blob(['I am a file']); // IE 11 and Edge don't support the File() constructor
            this.api.file(
                'create',
                {
                    module: 'Contacts',
                    id: '1',
                    field: 'picture'
                },
                [{files: [fileObject]}],
                this.callbacks
            );

            expect(xhr.requests[0].url).toMatch('/rest/v10/Contacts/1/file/picture');
            expect(xhr.requests[0].method).toBe('POST');
            expect(xhr.requests[0].requestHeaders).toEqual(jasmine.objectContaining({
                'OAuth-Token': 'file-oauth-token'
            }));
            let resp = this.fixtures['rest/v10/Contacts/1/file/picture'].POST.response;
            xhr.requests[0].respond(200, {'Content-Type': 'application/json'}, JSON.stringify(resp));

            expect(stub).toHaveBeenCalledOnce();
            expect(stub).toHaveBeenCalledWith(resp);
            stub.restore();
        });

        it('should delete files', function() {

            this.sandbox.stub(this.storage, 'get')
                .withArgs('AuthAccessToken').returns('file-oauth-token');

            let stub = sinon.stub(this.callbacks, 'success');

            let xhr = this.sandbox.useFakeXMLHttpRequest();

            this.api.file('delete', {
                module: 'Contacts',
                id: '1',
                field: 'picture'
            }, null, this.callbacks);

            expect(xhr.requests[0].url).toMatch('/rest/v10/Contacts/1/file/picture');
            expect(xhr.requests[0].method).toBe('DELETE');
            expect(xhr.requests[0].requestHeaders).toEqual(jasmine.objectContaining({
                'OAuth-Token': 'file-oauth-token'
            }));
            let resp = this.fixtures['rest/v10/Contacts/1/file/picture'].DELETE.response;
            xhr.requests[0].respond(200, {  'Content-Type':'application/json'}, JSON.stringify(resp));

            expect(stub).toHaveBeenCalled();
            expect(stub).toHaveBeenCalledWith(resp);
            stub.restore();
        });

        it('should upload temporary files', function() {
            let stub = sinon.stub(this.callbacks, 'success');

            let resp = this.fixtures['rest/v10/Contacts/temp/file/picture'].POST.response;
            this.server.respondWith('POST', /rest\/v10\/Contacts\/temp\/file\/picture.*/,
                [200, {  'Content-Type':'application/json'}, JSON.stringify(resp)]);

            this.api.file('create', {
                module: 'Contacts',
                id: 'temp',
                field: 'picture'
            }, null, this.callbacks);
            this.server.respond();
            expect(stub).toHaveBeenCalled();
            expect(stub).toHaveBeenCalledWith(resp);
            stub.restore();
        });

    });

    describe('Misc actions', function() {

        it("should fetch server info", function() {
            var spy = sinon.spy(this.callbacks, 'success');

            this.server.respondWith("GET", /\/rest\/v10\/ServerInfo.*/,
                [200, {  "Content-Type":"application/json"},
                    JSON.stringify({
                      "flavor": "ENT",
                      "version": "6.6"
                    })
                ]);

            this.api.info(this.callbacks);
            this.server.respond();

            expect(spy).toHaveBeenCalled();
            expect(spy.getCall(0).args[0]).toBeDefined();
            spy.restore();
        });

        it('should ping server', function() {
            var spy = sinon.spy(this.callbacks, 'success');

            this.server.respondWith('GET', /.*\/rest\/v10\/ping/,
                [200, { 'Content-Type': 'application/json'}, '']);

            this.api.ping(null, this.callbacks);
            this.server.respond();

            expect(spy).toHaveBeenCalled();
            spy.restore();
        });

        it('should ping server with an action', function() {
            var spy = sinon.spy(this.callbacks, 'success');

            this.server.respondWith('GET', /.*\/rest\/v10\/ping\/some_action/,
                [200, { 'Content-Type': 'application/json'}, '']);

            this.api.ping('some_action', this.callbacks);
            this.server.respond();

            expect(spy).toHaveBeenCalled();
            spy.restore();
        });

    });

    describe("Authentication", function() {

        it("should be able to detect when to refresh auth token", function() {

            this.sandbox.stub(this.storage, 'get')
                .withArgs('AuthRefreshToken').returns('refresh-me');

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

            let spy = this.sandbox.spy(this.callbacks, 'success');
            let setStub = this.sandbox.stub(this.storage, 'set');
            let requestBody;
            let extraInfo = {
                'uuid': 'xyz',
                'model': 'iPhone3,1',
                'osVersion': '5.0.1',
                'carrier': 'att',
                'appVersion': 'SugarMobile 1.0',
                'ismobile': true,
            };

            this.server.respondWith("POST", "/rest/v10/oauth2/token?platform=",
                [200, {  "Content-Type":"application/json"},
                    JSON.stringify(this.fixtures["/rest/v10/oauth2/token"].POST.response)]);

            this.api.login({ username: "admin", password: "password" }, extraInfo, this.callbacks);
            this.server.respond();

            expect(spy).toHaveBeenCalled();
            expect(spy.getCall(0).args[0]).toEqual(this.fixtures["/rest/v10/oauth2/token"].POST.response);

            expect(this.api.isAuthenticated()).toBeTruthy();
            expect(setStub).toHaveBeenCalledWith('AuthAccessToken', '55000555');
            expect(setStub).toHaveBeenCalledWith('AuthRefreshToken', 'abc');
            expect(setStub).toHaveBeenCalledWith('DownloadToken', 'qwerty');

            requestBody = JSON.parse(this.server.requests[0].requestBody);
            expect(requestBody['client_info']).toBeDefined();
            expect(requestBody['client_info'].uuid).toEqual(extraInfo.uuid);
            expect(requestBody.username).toEqual('admin');
        });

        it('should not login users with incorrect credentials', function () {

            let spy = sinon.spy(this.callbacks, 'error');
            let cutSpy = sinon.spy(this.storage, 'cut');

            let response = {"error": "need_login", "error_description": "some desc"};
            this.server.respondWith("POST", /.*\/oauth2\/token.*/,
                [401, {  "Content-Type":"application/json"}, JSON.stringify(response) ]);

            var request = this.api.login({ username:"invalid", password:"invalid" }, null, this.callbacks);
            var rspy = sinon.spy(request, "execute");

            this.server.respond();

            expect(spy).toHaveBeenCalled();
            expect(spy.getCall(0).args[0].status).toEqual(401);
            expect(spy.getCall(0).args[0].code).toEqual("need_login");

            expect(this.api.isAuthenticated()).toBeFalsy();

            expect(cutSpy).toHaveBeenCalledWith('AuthAccessToken');
            expect(cutSpy).toHaveBeenCalledWith('AuthRefreshToken');
            expect(cutSpy).toHaveBeenCalledWith('DownloadToken');

            // this spy is created after the method gets called
            // so, this assertion means that 'executes' is not called the second time
            expect(rspy).not.toHaveBeenCalled();

            spy.restore();
            cutSpy.restore();
            rspy.restore();
        });

        it('should handle multiple requests and refresh token in case of invalid_grant response', function() {

            this.sandbox.stub(this.storage, 'get')
                .withArgs('AuthAccessToken').returns('xyz')
                .withArgs('AuthRefreshToken').returns('qwe');

            let setStub = this.sandbox.stub(this.storage, 'set');

            let espy = sinon.spy(this.callbacks, 'error');
            let cspy = sinon.spy(this.callbacks, 'complete');
            let sspy = sinon.spy(this.callbacks, 'success');

            let xhr = this.sandbox.useFakeXMLHttpRequest();

            let request = this.api.records('read', 'Accounts', null, null, this.callbacks);
            let rspy = sinon.spy(request, 'execute');
            let request2 = this.api.records('read', 'Cases', null, null, this.callbacks);
            let rspy2 = sinon.spy(request2, 'execute');
            let request3 = this.api.records('read', 'Opportunities', null, null, this.callbacks);
            let rspy3 = sinon.spy(request3, 'execute');

            let headers = { 'Content-Type': 'application/json' };
            let invalidBody = JSON.stringify({
                error: 'invalid_grant',
                error_description: 'some desc',
            });

            expect(xhr.requests[0].url).toBe('/rest/v10/Accounts');
            expect(xhr.requests[0].requestHeaders).toEqual(jasmine.objectContaining({'OAuth-Token': 'xyz'}));
            xhr.requests[0].respond(401, headers, invalidBody);

            expect(xhr.requests[1].url).toBe('/rest/v10/Cases');
            expect(xhr.requests[1].requestHeaders).toEqual(jasmine.objectContaining({'OAuth-Token': 'xyz'}));
            xhr.requests[1].respond(401, headers, invalidBody);

            expect(xhr.requests[2].url).toBe('/rest/v10/Opportunities');
            expect(xhr.requests[2].requestHeaders).toEqual(jasmine.objectContaining({'OAuth-Token': 'xyz'}));
            xhr.requests[2].respond(401, headers, invalidBody);

            expect(xhr.requests[3].url).toBe('/rest/v10/oauth2/token?platform=');
            xhr.requests[3].respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(
                this.fixtures['/rest/v10/oauth2/token'].POST.response
            ));

            expect(xhr.requests[4].url).toBe('/rest/v10/Accounts');
            expect(xhr.requests[4].requestHeaders).toEqual(jasmine.objectContaining({'OAuth-Token': 'xyz'}));
            xhr.requests[4].respond(200, headers);

            expect(xhr.requests[5].url).toBe('/rest/v10/Cases');
            expect(xhr.requests[5].requestHeaders).toEqual(jasmine.objectContaining({'OAuth-Token': 'xyz'}));
            xhr.requests[5].respond(200, headers);

            expect(xhr.requests[6].url).toBe('/rest/v10/Opportunities');
            expect(xhr.requests[6].requestHeaders).toEqual(jasmine.objectContaining({'OAuth-Token': 'xyz'}));
            xhr.requests[6].respond(200, headers);

            expect(xhr.requests.length).toBe(7);

            expect(setStub).toHaveBeenCalledWith('AuthAccessToken', '55000555');
            expect(setStub).toHaveBeenCalledWith('AuthRefreshToken', 'abc');
            expect(rspy).toHaveBeenCalledOnce();
            expect(rspy2).toHaveBeenCalledOnce();
            expect(rspy3).toHaveBeenCalledOnce();
            expect(cspy.callCount).toEqual(3);
            expect(espy).not.toHaveBeenCalled();
            expect(sspy.callCount).toEqual(3);

            rspy.restore();
            rspy2.restore();
            rspy3.restore();
        });

        it('should pass error to original callback in case of invalid_grant response happens and the original request fails', function() {

            this.sandbox.stub(this.storage, 'get')
                .withArgs('AuthAccessToken').returns('xyz')
                .withArgs('AuthRefreshToken').returns('qwe');

            let setStub = this.sandbox.stub(this.storage, 'set');

            let espy = sinon.spy(this.callbacks, 'error');
            let cspy = sinon.spy(this.callbacks, 'complete');
            let sspy = sinon.spy(this.callbacks, 'success');

            let xhr = this.sandbox.useFakeXMLHttpRequest();

            let request = this.api.records('read', 'Accounts', null, null, this.callbacks);
            let rspy = sinon.spy(request, 'execute');

            let headers = { 'Content-Type': 'application/json' };
            let invalidBody = JSON.stringify({
                error: 'invalid_grant',
                error_description: 'some desc',
            });

            expect(xhr.requests[0].url).toBe('/rest/v10/Accounts');
            expect(xhr.requests[0].requestHeaders).toEqual(jasmine.objectContaining({'OAuth-Token': 'xyz'}));
            xhr.requests[0].respond(401, headers, invalidBody);

            expect(xhr.requests[1].url).toBe('/rest/v10/oauth2/token?platform=');
            xhr.requests[1].respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(
                this.fixtures['/rest/v10/oauth2/token'].POST.response
            ));

            expect(xhr.requests[2].url).toBe('/rest/v10/Accounts');
            expect(xhr.requests[2].requestHeaders).toEqual(jasmine.objectContaining({'OAuth-Token': 'xyz'}));
            xhr.requests[2].respond(404, headers, invalidBody);

            expect(setStub).toHaveBeenCalledWith('AuthAccessToken', '55000555');
            expect(setStub).toHaveBeenCalledWith('AuthRefreshToken', 'abc');

            expect(xhr.requests.length).toBe(3);

            expect(rspy).toHaveBeenCalledOnce();
            expect(espy).toHaveBeenCalledOnce();
            expect(cspy).toHaveBeenCalledOnce();
            expect(sspy).not.toHaveBeenCalled();
            expect(espy).toHaveBeenCalledWith(jasmine.any(Api.HttpError));
            expect(espy).toHaveBeenCalledWith(jasmine.objectContaining({status: 404}));

            espy.restore();
            cspy.restore();
            sspy.restore();
        });

        it('should handle multiple requests and stop refreshing in case of invalid_grant response happens more than once in a row', function() {

            this.sandbox.stub(this.storage, 'get')
                .withArgs('AuthAccessToken').returns('xyz')
                .withArgs('AuthRefreshToken').returns('qwe');

            let espy = sinon.spy(this.callbacks, 'error');
            let cspy = sinon.spy(this.callbacks, 'complete');
            let sspy = sinon.spy(this.callbacks, 'success');

            let xhr = this.sandbox.useFakeXMLHttpRequest();

            let request = this.api.records('read', 'Accounts', null, null, this.callbacks);
            let rspy = sinon.spy(request, 'execute');
            let request2 = this.api.records('read', 'Contacts', null, null, this.callbacks);
            let rspy2 = sinon.spy(request2, 'execute');
            let request3 = this.api.records('read', 'Meetings', null, null, this.callbacks);
            let rspy3 = sinon.spy(request3, 'execute');

            let headers = { 'Content-Type': 'application/json' };
            let invalidBody = JSON.stringify({
                error: 'invalid_grant',
                error_description: 'some desc',
            });

            expect(xhr.requests[0].url).toBe('/rest/v10/Accounts');
            expect(xhr.requests[0].requestHeaders).toEqual(jasmine.objectContaining({'OAuth-Token': 'xyz'}));
            xhr.requests[0].respond(401, headers, invalidBody);

            expect(xhr.requests[1].url).toBe('/rest/v10/Contacts');
            expect(xhr.requests[1].requestHeaders).toEqual(jasmine.objectContaining({'OAuth-Token': 'xyz'}));
            xhr.requests[1].respond(401, headers, invalidBody);

            expect(xhr.requests[2].url).toBe('/rest/v10/Meetings');
            expect(xhr.requests[2].requestHeaders).toEqual(jasmine.objectContaining({'OAuth-Token': 'xyz'}));
            xhr.requests[2].respond(401, headers, invalidBody);

            expect(xhr.requests[3].url).toBe('/rest/v10/oauth2/token?platform=');
            xhr.requests[3].respond(400, headers, invalidBody);

            expect(xhr.requests.length).toBe(4);

            expect(rspy).not.toHaveBeenCalled();
            expect(rspy2).not.toHaveBeenCalled();
            expect(rspy3).not.toHaveBeenCalled();
            expect(espy.callCount).toEqual(3);
            expect(cspy.callCount).toEqual(3);
            expect(sspy).not.toHaveBeenCalled();
            expect(espy).toHaveBeenCalledWith(jasmine.any(Api.HttpError));
            expect(espy).toHaveBeenCalledWith(jasmine.objectContaining({status: 401}));

            espy.restore();
            cspy.restore();
            sspy.restore();
            rspy.restore();
            rspy2.restore();
            rspy3.restore();
        });

        it('should not refresh token in case of invalid_grant response happens for auth request', function() {

            let cutStub = this.sandbox.stub(this.storage, 'cut');

            let espy = sinon.spy(this.callbacks, 'error');
            let cspy = sinon.spy(this.callbacks, 'complete');
            let sspy = sinon.spy(this.callbacks, 'success');

            let xhr = this.sandbox.useFakeXMLHttpRequest();

            this.api.login({ username: 'a', password: 'b'}, null, this.callbacks);

            expect(xhr.requests[0].url).toBe('/rest/v10/oauth2/token?platform=');
            xhr.requests[0].respond(400, { 'Content-Type': 'application/json' }, JSON.stringify({
                error: 'invalid_grant',
                error_description: 'some desc',
            }));

            expect(xhr.requests.length).toBe(1);

            expect(cutStub).toHaveBeenCalledWith('AuthAccessToken');
            expect(cutStub).toHaveBeenCalledWith('AuthRefreshToken');

            expect(espy).toHaveBeenCalledOnce();
            expect(cspy).toHaveBeenCalledOnce();
            expect(sspy).not.toHaveBeenCalled();
            expect(espy).toHaveBeenCalledWith(jasmine.any(Api.HttpError));
            expect(espy).toHaveBeenCalledWith(jasmine.objectContaining({status: 400}));

            espy.restore();
            cspy.restore();
            sspy.restore();
        });

        it('should not refresh token in case of invalid_grant while retrying queued requests', function() {

            this.sandbox.stub(this.storage, 'get')
                .withArgs('AuthAccessToken').returns('xyz')
                .withArgs('AuthRefreshToken').returns('qwe');

            let setStub = this.sandbox.stub(this.storage, 'set');
            let cutStub = this.sandbox.stub(this.storage, 'cut');

            let espy = sinon.spy(this.callbacks, 'error');
            let cspy = sinon.spy(this.callbacks, 'complete');
            let sspy = sinon.spy(this.callbacks, 'success');

            let xhr = this.sandbox.useFakeXMLHttpRequest();

            this.api.records('read', 'Accounts', null, null, this.callbacks);

            expect(xhr.requests[0].url).toBe('/rest/v10/Accounts');
            expect(xhr.requests[0].requestHeaders).toEqual(jasmine.objectContaining({'OAuth-Token': 'xyz'}));
            xhr.requests[0].respond(401, { 'Content-Type': 'application/json' }, JSON.stringify({
                error: 'invalid_grant',
                error_description: 'some desc',
            }));

            expect(xhr.requests[1].url).toBe('/rest/v10/oauth2/token?platform=');
            xhr.requests[1].respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(
                this.fixtures['/rest/v10/oauth2/token'].POST.response
            ));

            expect(setStub).toHaveBeenCalledWith('AuthAccessToken', '55000555');
            expect(setStub).toHaveBeenCalledWith('AuthRefreshToken', 'abc');

            // simulate invalid_grant again
            expect(xhr.requests[2].url).toBe('/rest/v10/Accounts');
            expect(xhr.requests[2].requestHeaders).toEqual(jasmine.objectContaining({'OAuth-Token': 'xyz'}));
            xhr.requests[2].respond(401, { 'Content-Type': 'application/json' }, JSON.stringify({
                error: 'invalid_grant',
                error_description: 'some desc',
            }));

            expect(cutStub).toHaveBeenCalledWith('AuthAccessToken');
            expect(cutStub).toHaveBeenCalledWith('AuthRefreshToken');

            expect(xhr.requests.length).toBe(3);

            expect(espy).toHaveBeenCalledOnce();
            expect(cspy).toHaveBeenCalledOnce();
            expect(sspy).not.toHaveBeenCalled();
            expect(espy).toHaveBeenCalledWith(jasmine.any(Api.HttpError));
            expect(espy).toHaveBeenCalledWith(jasmine.objectContaining({status: 401}));

            espy.restore();
            cspy.restore();
            sspy.restore();
        });

        it('should logout user', function () {

            let spy = sinon.spy(this.callbacks, 'success');
            let cutSpy = sinon.spy(this.storage, 'cut');

            this.server.respondWith("POST", "/rest/v10/oauth2/logout", [200, {"Content-Type":"application/json"}, ""]);

            this.api.logout(this.callbacks);
            this.server.respond();

            expect(spy).toHaveBeenCalled();

            expect(this.api.isAuthenticated()).toBeFalsy();
            expect(cutSpy).toHaveBeenCalledWith('AuthAccessToken');
            expect(cutSpy).toHaveBeenCalledWith('AuthRefreshToken');
            expect(cutSpy).toHaveBeenCalledWith('DownloadToken');

            spy.restore();
            cutSpy.restore();
        });

        describe('External logins', function () {
            it('should let you set the external login status', function () {
                let originalExternalLogin = this.api.isExternalLogin();
                let newExternalLogin = !originalExternalLogin;
                this.api.setExternalLogin(newExternalLogin);
                expect(this.api.isExternalLogin()).toEqual(newExternalLogin);
                this.api.setExternalLogin(originalExternalLogin);
            });

            it('should call the externalLoginUICallback against the provided error url', function () {
                let callback = sinon.spy();
                let api = Api.createInstance({
                    externalLoginUICallback: callback,
                });
                let error = {
                    payload: {
                        url: 'http://example.com'
                    }
                };
                api.handleExternalLogin(new Api.HttpRequest({}), error, $.noop);
                expect(callback).toHaveBeenCalledWith(error.payload.url);
            });

            it('should call onError but stop before _refreshTokenSuccess if auth failed', function () {
                let onErrorStub = sinon.stub();
                let successStub = sinon.stub();
                let done = false;
                let complete = function() { done = true; };

                $(window).on('message', complete);

                this.api.setRefreshTokenSuccessCallback(successStub);
                this.api.handleExternalLogin(new Api.HttpRequest({}), {}, onErrorStub);

                window.postMessage(JSON.stringify({access_token: null}), '*');

                waitsFor(function() {
                    return done;
                });

                runs(function() {
                    $(window).off('message', complete);
                    expect(onErrorStub).toHaveBeenCalled();
                    expect(successStub).not.toHaveBeenCalled();
                });
            });
        });
    });

    describe('signup', function () {
        it('should register a lead', function () {
            let spy = sinon.spy(this.callbacks, 'success');

            this.server.respondWith('POST', '/rest/v10/Leads/register',
                [200, {'Content-Type': 'application/json'}, '']);

            let request = this.api.signup({ first_name: 'John', last_name: 'Doe' }, {}, this.callbacks);
            this.server.respond();

            expect(spy).toHaveBeenCalledWith(null, request);
            spy.restore();
        });
    });

    describe('Following', function () {
        it('should subscribe or unsubscribe as appropriate', function () {
            let module = 'Accounts';
            let id = '1234';
            let spy = sinon.spy(this.callbacks, 'success');

            let data = [
                {
                    followed: true,
                    method: 'POST',
                    action: 'subscribe',
                },
                {
                    followed: false,
                    method: 'DELETE',
                    action: 'unsubscribe',
                }
            ];
            _.each(data, function (option) {
                this.server.respondWith(option.method, ['/rest/v10', module, id, option.action].join('/'),
                    [200, { 'Content-Type': 'application/json' }, '']);

                let request = this.api.follow(module, id, option.followed, this.callbacks);
                this.server.respond();

                expect(spy).toHaveBeenCalledWith(null, request);
            }.bind(this));

            spy.restore();
        });
    });

    describe('Me API', function () {
        it('should read my information', function () {
            let spy = sinon.spy(this.callbacks, 'success');

            this.server.respondWith('GET', '/rest/v10/me',
                [200, { 'Content-Type': 'application/json' }, '']);

            let request = this.api.me('read', {}, {}, this.callbacks);
            this.server.respond();

            expect(spy).toHaveBeenCalledWith(null, request);
            spy.restore();
        });
    });

    describe("HttpError", function() {

        describe('toString', function () {
            it('should display details of the error', function () {
                let error = new Api.HttpError({
                    xhr: {
                        status: 401,
                        responseText: '{ "error": "forbidden", "error_message": "this is forbidden" }',
                        getResponseHeader: () => { return 'application/json' },
                    },
                }, 'my text status', 'my error');
                expect(error.toString()).toEqual([
                    'HTTP error: 401',
                    'type: my text status',
                    'error: my error',
                    'response: { "error": "forbidden", "error_message": "this is forbidden" }',
                    'code: forbidden',
                    'message: this is forbidden'
                ].join('\n'));
            });
        });

        it("should be able properly instantiate itself", function() {
            var xhr = {
                status: 404,
                responseText: "response text",
                getResponseHeader: function() { return "application/json" }
            };

            var error = new Api.HttpError({ xhr: xhr }, "text status", "error thrown");
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

            error = new Api.HttpError({ xhr: xhr }, "text status", "error thrown");
            expect(error.status).toEqual(401);
            expect(error.code).toEqual("invalid_grant");
            expect(error.message).toEqual("some message");

            xhr = {
                status: 500,
                responseText: "Something really bad happened",
                getResponseHeader: function() { return "text/html; charset=iso-8859-1"; }
            };

            error = new Api.HttpError({ xhr: xhr }, "text status", "error thrown");
            expect(error.status).toEqual(500);
            expect(error.code).toBeUndefined();
            expect(error.description).toBeUndefined();
        });

    });

    describe("HttpRequest", function() {
        let spy, request;

        beforeEach(function () {
            spy = sinon.spy($, 'ajax');
            request = new Api.HttpRequest({});
        });

        afterEach(function () {
            spy.restore();
        });

        it("should be able to set oauth header before executing ajax request", function() {
            request.execute("xyz");
            expect(request.params.headers["OAuth-Token"]).toEqual("xyz");
            expect(spy).toHaveBeenCalled();
            expect(request.xhr).toBeDefined();
        });

        it('should be able to set metadata hash', function () {
            request.execute('something', 'my-metadata-hash');
            expect(request.params.headers['X-Metadata-Hash']).toEqual('my-metadata-hash');
        });

        it('should be able to set userpref hash', function () {
            request.execute('something', 'my-metadata-hash', 'my-userpref-hash');
            expect(request.params.headers['X-Userpref-Hash']).toEqual('my-userpref-hash');
        });
    });

    describe('Hash of requests', function() {

        it('should clean hash of requests on success', function() {

            this.server.respondWith(function(xhr) {
                xhr.respond(200, {'Content-Type': 'application/json'});
            });

            let request = this.api.records('read', 'Accounts', null, null, this.callbacks);

            expect(this.api.getRequest(request.uid)).toBeDefined();

            this.server.respond();

            expect(this.api.getRequest(request.uid)).toBeNull();
        });

        it('should abort request by id', function() {


            let sstub = sinon.stub(this.callbacks, 'success');
            let estub = sinon.stub(this.callbacks, 'error', function(err) {
                expect(err).toEqual(jasmine.any(Api.HttpError));
                expect(err.request.aborted).toBeTruthy();
            });
            let cstub = sinon.stub(this.callbacks, 'complete', function(xhr) {
                expect(xhr.aborted).toBeTruthy();
            });

            let request = this.api.records('read', 'Accounts', null, null, this.callbacks);

            expect(this.api.getRequest(request.uid)).toBeDefined();

            expect(request.aborted).toBeUndefined();

            this.api.abortRequest(request.uid);

            expect(request.aborted).toBeTruthy();

            expect(sstub).not.toHaveBeenCalled();
            expect(estub).toHaveBeenCalled();
            expect(cstub).toHaveBeenCalledWith(request);

            sstub.restore();
            estub.restore();
            cstub.restore();
        });
    });

    describe('File Downloads', function () {
        it('should ping before using the iframe hack', function () {
            let callStub = sinon.stub(this.api, 'call');
            this.api.fileDownload('myfile');
            expect(callStub).toHaveBeenCalledWith('read', '/rest/v10/ping');
            callStub.restore();
        });
    });

    describe('State properties', function () {
       it('should store and clear state', function () {
           this.api.resetState();
           this.api.setStateProperty('my key', 'my value');
           expect(this.api.getStateProperty('my key')).toEqual('my value');
           this.api.clearStateProperty('my key');
           expect(this.api.getStateProperty('my key')).toBeUndefined();
       });
    });

    describe("Bulk Requests", function () {
        it('should not request if bulk calls are disabled', function () {
            let api = Api.createInstance({ disableBulkApi: true });
            api.call('read', '/rest/v10/ping', null, null, { bulk: true });
            let callStub = sinon.stub(api, 'call');
            api.triggerBulkCall();
            expect(callStub.called).toBeFalsy();
            callStub.restore();
        });

        it('should not request if there is no queue', function () {
            // FIXME: we also need to test that we should throw an error
            this.api.clearBulkQueue();
            let callStub = sinon.stub(this.api, 'call');
            this.api.triggerBulkCall();
            expect(callStub.called).toBeFalsy();
            callStub.restore();
        });

        describe('bulk method', function() {
            it('should make a bulk call with the provided arguments', function () {
                let callStub = sinon.stub(this.api, 'call');
                let data = { requests: ['test request'] };
                let callbacks = { myCallback: $.noop };
                let options = { async: true };
                this.api.bulk(data, callbacks, options);
                expect(callStub).toHaveBeenCalledWith('create', '/rest/v10/bulk', data, callbacks, options);
                callStub.restore();
            });
        });

        it("should queue rather than call when bulk is set to an ID", function() {
            var ajaxStub = sinon.spy($, 'ajax');
            this.server.respondWith(function(xhr) {
                xhr.respond(200, {"Content-Type": "application/json"}, JSON.stringify({}));
            });
            this.api.call("read", "/rest/v10/ping", null, null, {bulk:true});
            expect(ajaxStub.called).toBeFalsy();

            ajaxStub.restore();
            this.api.clearBulkQueue();
        });

        it("should queue hit the bulk API endpoint", function() {
            this.api.clearBulkQueue();
            this.server.respondWith(function(xhr) {
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
            this.server.respond();

            expect(response).toEqual("pong");
        });

        it("should return a valid xhr object", function() {
            this.api.clearBulkQueue();
            this.server.respondWith(function(xhr) {
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
            this.server.respond();

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
            this.server.respondWith(function(xhr) {
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
            this.server.respond();

            expect(success).toBeFalsy();
            expect(errorCalled).toBeTruthy();
            expect(complete).toBeTruthy();
        });
    });
});
