describe('SUGAR.Api', function() {

    beforeEach(function() {
        //instantiating API Instance
        this.api = SUGAR.Api.getInstance();
        //get fresh fixtures
        this.fixtures = fixtures;
        //create fakeserver to make requests
        this.server = sinon.fakeServer.create();
    });

    afterEach(function() {
        this.server.restore();
    });

    it('should return an api instance', function() {
        expect(typeof(this.api)).toBe('object');
        expect(this.api.baseUrl).toEqual('/rest/v10/');
    });

    describe('requestHandler', function() {
        it('should make a request', function() {
            // Spy on jQuery's ajax method
            var spy = sinon.spy(jQuery,'ajax');

            //@arguments: method, URL, options
            this.api.call('GET','/rest/v10/contact');

            // Spy was called
            expect(spy).toHaveBeenCalled();

            // Check url property of first argument
            expect(spy.getCall(0).args[0])
                .toEqual("/rest/v10/contact");
            // Restore jQuery.ajax to normal
            jQuery.ajax.restore();
        });

        it('should set the right method on request', function() {
            // Spy on jQuery's ajax method
            var spy = sinon.spy(jQuery,'ajax');

            //@arguments: method, URL, options
            this.api.call('POST','/rest/v10/contact');

            // Spy was called
            expect(spy).toHaveBeenCalled();

            // Check url property of first argument
            expect(spy.getCall(0).args[1].type)
                .toEqual("POST");

            // Restore jQuery.ajax to normal
            jQuery.ajax.restore();
        });

        it('should set the right options on request', function() {
            // Spy on jQuery's ajax method
            var spy = sinon.spy(jQuery,'ajax');

            //@arguments: method, URL, options
            this.api.call('GET','/rest/v10/contact', {async:true});

            // Spy was called
            expect(spy).toHaveBeenCalled();

            // Check url property of first argument
            expect(spy.getCall(0).args[1].type)
                .toEqual("GET");
            // Restore jQuery.ajax to normal
            jQuery.ajax.restore();
        });

        it('should handle successful responses', function() {
            //TODO
        });
        it('should handle error responses', function() {
            //TODO
        });
    });


    describe('urlBuilder', function() {
        it('should build resource URLs', function() {
            //TODO
        });

        it('should build action URLs', function() {
            //TODO
        });
    });

    describe('CRUD actions', function() {
        it('should create bean', function() {
            //TODO
        });

        it('should retrieve bean', function() {
            //TODO
        });

        it('should update bean', function() {
            //TODO
        });

        it('should delete bean', function() {
            //TODO
        });

    });

    describe('special actions', function() {
        it('should retrieve metadata', function() {
            //TODO
        });

        it('should retrieve sugarFields', function() {
            //TODO
        });

        it('should login user', function() {
            //TODO
        });

        it('should check if user is authenticated', function() {
            //TODO
        });

        it('should logout user', function() {
            //TODO
        });
    });

});

