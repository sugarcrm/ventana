describe('SugarCRM Javascript API', function() {

    beforeEach(function() {
        this.validUsername = "admin";
        this.validPassword = "asdf";
        this.invalidUserName = "invalid";
        this.invalidPassword = "invalid"
        //instantiating API Instance
        this.api = SUGAR.Api.getInstance();
        //get fresh fixtures
        this.fixtures = fixtures.api;
        //create fakeserver to make requests
        this.server = sinon.fakeServer.create();
        this.callbacks = {
            success: function(data){
                console.log("sucess callback");
                console.log("data");
                console.log(data);
            },
            error: function(data){
                console.log("error callback");
            }
        };
    });

    afterEach(function() {
        this.server.restore();
    });

    it('should return an api instance', function() {
        expect(typeof(this.api)).toBe('object');
        expect(this.api.baseUrl).toEqual('rest/v10/');
    });

    describe('requestHandler', function() {
        it('should make a request with the correct request url', function() {
            // Spy on jQuery's ajax method
            var spy = sinon.spy(jQuery,'ajax');

            //@arguments: method, URL, options
            this.api.call('get','rest/v10/contact');

            // Spy was called
            expect(spy).toHaveBeenCalled();

            // Check url property of first argument
            expect(spy.getCall(0).args[0].url)
                .toEqual("rest/v10/contact");
            // Restore jQuery.ajax to normal
            jQuery.ajax.restore();
        });

        it('should set the right method on request', function() {
            // Spy on jQuery's ajax method
            var spy = sinon.spy(jQuery,'ajax');

            //@arguments: method, URL, options
            this.api.call('update','/rest/v10/contacts');

            // Spy was called
            expect(spy).toHaveBeenCalled();

            // Check url property of first argument
            expect(spy.getCall(0).args[0].type)
                .toEqual("PUT");

            // Restore jQuery.ajax to normal
            jQuery.ajax.restore();
        });

        it('should set the right options on request', function() {
            // Spy on jQuery's ajax method
            var spy = sinon.spy(jQuery,'ajax');

            //@arguments: method, URL, options
            this.api.call('get','/rest/v10/contacts', {}, {async:true});
            console.log(spy.getCall(0));
            // Spy was called
            expect(spy).toHaveBeenCalled();

            // Check url property of first argument
            expect(spy.getCall(0).args[0].async).toBeTruthy();
            // Restore jQuery.ajax to normal
            jQuery.ajax.restore();
        });

        it('should handle successful responses', function() {

            this.server.respondWith("GET", "rest/v10/contacts/1234/",
                        [200, {  "Content-Type":"application/json"},
                            JSON.stringify(this.fixtures["rest/v10/contact"].GET.response[1])]);

            var result = this.api.call('get','rest/v10/contacts/1234/', {}, {}, this.callbacks);
            this.server.respond(); //tell server to respond to pending async call

            expect(result.responseText).toEqual(JSON.stringify(this.fixtures["rest/v10/contact"].GET.response[1]));
        });

        it('should fire error callbacks and return requests objects on error', function() {

            this.server.respondWith("GET", "rest/v10/contacts/123",
                        [fixtures.api.responseErrors.fourhundred.code, { "Content-Type":"application/json" },
                            this.fixtures.responseErrors.fourhundred.body]);
            var result = this.api.call('get','rest/v10/contacts/123', {}, {}, this.callbacks);

            this.server.respond(); //tell server to respond to pending async call

            expect(result.responseText).toEqual(this.fixtures.responseErrors.fourhundred.body);
        });
    });


    describe('urlBuilder', function() {
        it('should build resource URLs for resources without ids', function() {
            //TODO
            var attributes = {};
            var module = "Contacts";
            var action = "create";
            var params = [];
            var url = this.api.buildURL(module, action, attributes, params);

            expect(url).toEqual('rest/v10/Contacts/');
        });

        it('should build resource URLs for resources with ids', function() {
            //TODO
            var module = "Contacts";
            var action = "update";
            var params = [];
            var attributes = {module:'contacts', id:'1234'}
            var url = this.api.buildURL(module, action, attributes, params);

            expect(url).toEqual('rest/v10/Contacts/1234/');
        });

        it('should build resource URLs for resources with standard actions', function() {
            //TODO
            var module = "Contacts";
            var action = "update";
            var params = [];
            var attributes = {module:'contacts', id:'1234', action:'Update'}
            var url = this.api.buildURL(module, action, attributes, params);

            expect(url).toEqual('rest/v10/Contacts/1234/');
        });

        it('should build resource URLs for resources with custom actions', function() {
            //TODO
            var module = "Contacts";
            var action = "customAction";
            var params = [];
            var attributes = {module:'contacts', id:'1234'}
            var url = this.api.buildURL(module, action, attributes, params);

            expect(url).toEqual('rest/v10/Contacts/1234/customAction/');
        });


        it('should build resource URLs for resources with custom params', function() {
            //TODO
            var module = "Contacts";
            var action = "update";
            var params = [{key:"fields",value:"first_name,last_name"},{key:"timestamp",value:"NOW"}];
            var attributes = { id:'1234'}
            var url = this.api.buildURL(module, action, attributes, params);
            expect(url).toEqual('rest/v10/Contacts/1234/?fields=first_name,last_name&timestamp=NOW');
        });
    });

    describe('CRUD actions', function() {
        it('should get a bean', function() {
            var spy = sinon.spy(this.callbacks,'success');
            this.server.respondWith("GET", "rest/v10/Contacts/1234/",
                        [200, {  "Content-Type":"application/json"},
                            JSON.stringify(this.fixtures["rest/v10/contact"].GET.response[1])]);


            var module = "Contacts";
            var params = "";
            var attributes = {id:"1234"};
            var bean = this.api.get(module, attributes, params, this.callbacks);

            this.server.respond(); //tell server to respond to pending async call
            expect(spy.getCall(0).args[0]).toEqual(this.fixtures["rest/v10/contact"].GET.response[1]);
            this.callbacks.success.restore();
        });

        it('should create bean', function() {
            var spy = sinon.spy(this.callbacks,'success');
            this.server.respondWith("POST", "rest/v10/Contacts/",
                        [200, {  "Content-Type":"application/json"},
                            JSON.stringify(this.fixtures["rest/v10/contact"].PUT.response)]);

            var module = "Contacts";
            var params = "";
            var attributes = {first_name:"Ronald", last_name:"McDonald", phone_work:"0980987", description:"This dude is cool."};
            this.api.create(module, attributes, params, this.callbacks);

            this.server.respond(); //tell server to respond to pending async call
            expect(spy.getCall(0).args[0]).toEqual(this.fixtures["rest/v10/contact"].PUT.response);
            this.callbacks.success.restore();
        });


        it('should get beans', function() {
            var spy = sinon.spy(this.callbacks,'success');
            this.server.respondWith("GET", "rest/v10/Contacts/",
                        [200, {  "Content-Type":"application/json"},
                            JSON.stringify(this.fixtures["rest/v10/contact"].GET.response)]);


            var module = "Contacts";
            var params = "";
            var attributes = {};
            var bean = this.api.get(module, attributes, params, this.callbacks);

            this.server.respond(); //tell server to respond to pending async call
            expect(spy.getCall(0).args[0]).toEqual(this.fixtures["rest/v10/contact"].GET.response);
            this.callbacks.success.restore();
        });

        xit('should update bean', function() {
            //TODO


            var spy = sinon.spy(this.callbacks,'success');
            this.server.respondWith("PUT", "rest/v10/Contacts/",
                        [200, {  "Content-Type":"application/json"},
                            JSON.stringify(this.fixtures["rest/v10/contact"].GET.response)]);


            var module = "Contacts";
            var params = "";
            var attributes = {first_name:"Ronald", last_name:"McDonald", phone_work:"1234123", description:"This dude is cool."};
            this.api.update(module, attributes, params, this.callbacks);

            this.server.respond(); //tell server to respond to pending async call
            expect(spy.getCall(0).args[0]).toEqual("");
            this.callbacks.success.restore();
        });

        it('should delete bean', function() {
            var spy1 = sinon.spy(this.callbacks,'error');
            var spy = sinon.spy(this.callbacks,'success');
            this.server.respondWith("DELETE", "rest/v10/Contacts/1234/",
                        [200, {  "Content-Type":"application/json"}, ""]);


            var module = "Contacts";
            var params = "";
            var attributes = {id:"1234"};
            this.api.delete(module, attributes, params, this.callbacks);

            this.server.respond(); //tell server to respond to pending async call
            expect(spy.getCall(0).args[0]).toEqual(null);
            expect(spy.getCall(0).args[2].status).toEqual(200);
            expect(spy.getCall(0).args[2].responseText).toEqual("");
            this.callbacks.success.restore();
        });

    });

    describe('special actions', function() {
        it('should retrieve metadata', function() {
            //TODO
            var metadata=this.api.getMetadata(types, modules, this.callbacks);
        });

        it('should retrieve sugarFields', function() {
            //TODO
            var sugarFieldData=this.api.getSugarFields(hash, this.callbacks);

        });

        it('should login users with correct credentials', function() {
            var loginResult=this.api.login(this.validUsername, this.validPassword);

            expect(loginResult).toBeTruthy();
        });

        it('should not login users with incorrect credentials', function() {
            var loginResult=this.api.login(this.invalidUsername, this.invalidPassword);

            expect(loginResult).toBeFalsy();
        });

        it('should check if user is authenticated', function() {
            this.api.login(this.validUsername, this.validPassword);
            var loginState = this.api.isAuthenticated();

            expect(loginState).toBeTruthy();
        });

        it('should logout user', function() {
            var logoutResult = this.api.logout();

            expect(logoutResult).toBeTruthy();
        });
    });

});

