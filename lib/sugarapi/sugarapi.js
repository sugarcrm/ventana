/**
 SugarCRM Javascript API
 * @ignore
 */

//create the SUGAR namespace if one does not exist already
var SUGAR = SUGAR || {};

/**
 * @class Api
 * @singleton
 * SugarCRM Javascript API allows users to interact direct with sugarCRM via its REST interface.
 */
SUGAR.Api = (function() {
    var instance;
    var methodsToRequest = {
        "get": "GET",
        "update": "PUT",
        "create": "POST",
        "delete": "DELETE"
    };

    /**
     * Private method to retreive / insstantiate instance of sugar API
     * @private
     * @param args
     * @return {Object} Instance
     */
    function init(args) {
        instance = new SugarApi(args);
        return instance;
    }

    /*
     * This is a constructor for API class
     * @params: pass optional arguments
     */
    function SugarApi(args) {
        var _baseUrl = "/rest/v10";
        var token = "";
        var isAuth = false;
        // vars to store uesr callbacks for login and logout
        var _loginCallbacks = {};
        var _logoutCallbacks = {};

        if (args && args.baseUrl) {
            _baseUrl = args.baseUrl;
        }

        /**
         * handles login success, calls user callbacks after it sets internal token and isAuth
         * @private
         * @param  {Object} processed json response from successful login
         */
        function handleLoginSuccess(successObj) {
            isAuth = true;
            if (successObj.token) {
                token = successObj.token;
            }
            if (_loginCallbacks.success) {
                _loginCallbacks.success(successObj);
            }
        }

        /**
         * handles login error, calls user supplied callbacks to .logout passing the ajax request object
         * @private
         * @param  {Object}
            */
        function handleLoginFailure(failObj) {
            isAuth = false;
            if (_loginCallbacks.error) {
                _loginCallbacks.error(failObj);
            }
        }

        /**
         * handles logout success, calls user callbacks after it clears internal token and isAuth
         * @private
         * @param  {Object} processed json response from successful logout in this case its null
         */
        function handleLogoutSuccess(successObj) {
            isAuth = false;
            token = "";

            if (_logoutCallbacks.success) {
                _logoutCallbacks.success(successObj);
            }

        }

        /**
         * handles logout error, calls user supplied callbacks to .logout passing the ajax request object
         * @private
         * @param  {Object} jquery ajax request object
         */
        function handleLogoutFailure(failObj) {
            isAuth = true;
            //console.log("logout fail");

            if (_logoutCallbacks.error) {
                _logoutCallbacks.error(failObj);
            }
        }

        return {
            /**
             * @property {String}
             * Base url for where rest interface resides
             */
            baseUrl: _baseUrl,
            /**
             * @property {Boolean}
             * set to true to enable console debugging of api calls
             */
            debug: false,

            /**
             * make ajax call via jquery ajax
             *
             * @param  {String} method - request method to make, crud actions map above eg POST, GET, create,
             * @param  {String} url
             * @param  {Object} attributes - attributes will be stringified and set to data eg {first_name:"bob", last_name:"saget"}
             * @param  {Array}  options - options for request that map directly to the jquery.ajax options
             * @param  {Object} callbacks - with with callbacks of the format {Success: function(data){}, error: function(data){}} to be called
             * @return object jquery Request object
             */
            call: function(method, url, attributes, options, callbacks) {
                var i, server;
                var type = methodsToRequest[method];

                // by default use json headers
                var params = {type: type, dataType: 'json'};

                options = options || {};
                callbacks = callbacks || {};

                // if we dont have a url from options take arg url
                if (!options.url) {
                    params.url = url;
                }

                //add callbacks
                if (callbacks.success) {
                    params.success = callbacks.success;
                }

                if (callbacks.error) {
                    params.error = callbacks.error;
                }

                if (token) {
                    params.headers = {"OAuth-Token": token};
                }

                // set data for create and update
                if (attributes && (method == 'create' || method == 'update')) {
                    params.contentType = 'application/json';
                    params.data = JSON.stringify(attributes);
                }

                // Don't process data on a non-GET request.
                if (params.type !== 'GET') {
                    params.processData = false;
                }

                if (this.debug) {
                    console.log("====== Ajax Request Begin ======");
                    console.log("Request URL: " + url);
                    console.log("Request Type: " + type);
                    console.log("Payload: ");
                    console.log(attributes);
                    console.log("options: ");
                    console.log(params);
                    console.log("callbacks: ");
                    console.log(callbacks);
                    console.log("====== Request End ======");
                }

                if (SUGAR.demoRestServer && SUGAR.restDemoData) {
                    for (i = 0; i < SUGAR.restDemoData.length; i++) {
                        if (SUGAR.restDemoData[i].route.test(url)) {
                            console.log("===Matched demo server route starting demo server===");
                            console.log("====== url ======");
                            console.log(url);
                            console.log("====== ds route ======");
                            console.log(SUGAR.restDemoData[i].route);
                            server = SUGAR.demoRestServer();
                        }
                    }
                }

                // Make the request, allowing override of any Ajax options.
                var result = $.ajax(_.extend(params, options));

                if (SUGAR.demoRestServer && SUGAR.restDemoData) {
                    for (i = 0; i < SUGAR.restDemoData.length; i++) {
                        if (SUGAR.restDemoData[i].route.test(url)) {
                            console.log("===Demo Server Responding and Restoring===");
                            server.respond();
                            server.restore();
                        }
                    }
                }

                return result;
            },

            /**
             * builds urls based on module name action and attributes of the format rooturl/module/id/action
             *
             * @param  {String} module - module name
             * @param  {String} action
             * @param  {Object} attributes - object of resource being saved eg {name: "bob", id:"123"} id will be taken from here if set
             * @param  {Array}  params array of objects of the format below to be added as url params
             *         [{key:"timestamp", value: "NOW"}{key:"fields",value:"first_name"}]
             * @return {String} url for specified resource
             */
            buildURL: function(module, action, attributes, params) {
                var baseActions = ["get", "update", "create", "delete"];
                var resultArray = [];
                var result;
                var plist = [];
                var pIndex;
                resultArray.push(this.baseUrl);

                if (module) {
                    resultArray.push(module);
                }

                if (attributes && attributes.id) {
                    resultArray.push(attributes.id);
                }

                if (action && baseActions.indexOf(action) == -1) {
                    resultArray.push(action);
                }

                result = resultArray.join("/");

                // concat and add params
                if (params && params.length > 0) {
                    for (pIndex in params) {
                        plist.push(params[pIndex].key + '=' + params[pIndex].value);
                    }
                    plist = plist.join("&");
                    result += '?' + plist;
                }

                return result;
            },
            /**
             * gets sugar fields
             *
             * @param  {Array} type strings for modules to get meta data for eg ['accounts','contacts']
             * @param  {Array}  module strings for metadata types to get metadata for eg ['vardefs','detailviewdefs']
             * @param  {Object} callbacks with callbacks of the format {Success: function(data){}, error: function(data){}} in success data will the object being retrieved
             * @return {Object}  ajax request obj from this call
             */
            getMetadata: function(type, modules, callbacks) {
                var modstring = modules.join(",");
                var typestring = type.join(",");
                var params = [
                    {"key": "type", "value": typestring},
                    {"key": "filter", "value": modstring}
                ];
                var method = 'get';
                var module = "metadata";
                var url = this.buildURL(module, method, {}, params);
                return this.call(method, url, {}, {}, callbacks);
            },

            /**
             * gets sugar fields
             *
             * @param  {String} hash for current fieldset
             * @param  {Object} callbacks callbacks of the format {Success: function(data){}, error: function(data){}} in success data will the object being retrieved
             * @return {Object} ajax request obj from this call
             */
            getSugarFields: function(hash, callbacks) {
                var module = 'sugarFields';
                var method = 'get';
                var params = [
                    {"key": "md5", "value": hash}
                ];
                var url = this.buildURL(module, method, {}, params);

                return this.call(method, url, {}, {}, callbacks);
            },

            /**
             * Gets beans.
             *
             * @param  {String} module module name
             * @param  {Object} attributes attribute object with id of bean being gotten eg {id:"123"}, no id will retrieve a list
             * @param  {Array}  params parameter hash: <code>[{key:"timestamp", value: "NOW"}{key:"fields",value:"first_name"}]</code> to be added as url params
             * @param  {Object} callbacks callbacks hash: <code>{ success: function(data){}, error: function(data){} }</code> in success data will the object being retrieved
             * @return {Object} ajax request obj from this call
             */
            get: function(module, attributes, params, callbacks) {
                var method = 'get';
                var url = this.buildURL(module, method, attributes, params);

                return this.call(method, url, attributes, {}, callbacks);
            },

            /**
             * Gets related beans.
             *
             * @param  {String} module module name
             * @param  {String} id id of the parent bean
             * @param  {String} link relationship link
             * @param  {Array}  params of objects of the format [{key:"timestamp", value: "NOW"}{key:"fields",value:"first_name"}] to be added as url params
             * @param  {Object} callbacks callbacks hash: <code>{ success: function(data){}, error: function(data){} }</code> in success data will the object being retrieved
             * @return {Object} ajax request obj from this call
             */
            getRelations: function(module, id, link, params, callbacks) {
                var url = this.buildURL(module, link, { id: id }, params);
                return this.call('get', url, null, null, callbacks);
            },

            // TODO: Implement create/delete relationship once REST API is spec'ed out.

            /**
             * Creates a bean.
             *
             * @param  {String} module module name
             * @param  {Object} attributes attribute object with properties of bean being saved eg {first_name:"bob", last_name"saget"}
             * @param  {Array}  params objects of the format [{key:"timestamp", value: "NOW"}{key:"fields",value:"first_name"}] to be added as url params
             * @param  {Object} callbacks of the format {Success: function(data){}, error: function(data){}} in success data will be an object with an id of the object being created
             * @return {Object} ajax request obj from this call
             */
            create: function(module, attributes, params, callbacks) {
                var method = 'create';
                var url = this.buildURL(module, method, attributes, params);

                return this.call(method, url, attributes, {}, callbacks);
            },

            /**
             * Updates a bean.
             *
             * @param  {String} module module name
             * @param  {Object} attributes attribute object with properties of bean being updated eg {first_name:"george", last_name"saget"}
             * @param  {Array}  params of objects of the format [{key:"timestamp", value: "NOW"}{key:"fields",value:"first_name"}] to be added as url params
             * @param  {Object} with with callbacks of the format {Success: function(data){}, error: function(data){}} on success data will be an object with an id of the object being created
             * @return {Object}ajax request obj from this call
             */
            update: function(module, attributes, params, callbacks) {
                var method = 'update';
                var url = this.buildURL(module, method, attributes, params);

                return this.call(method, url, attributes, {}, callbacks);
            },

            /**
             * Deletes a bean.
             *
             * @param  {String} module module name
             * @param  {Object} attributes attribute object with id of bean being deleted eg {first_name:"george", last_name"saget"}
             * @param  {Array} params  of objects of the format [{key:"timestamp", value: "NOW"}{key:"fields",value:"first_name"}]
             *         to be added as url params
             * @param  {Object} callbacks with with callbacks of the format {Success: function(data){}, error: function(data){}}
             * @return {Object} ajax request obj from this call
             */
            "delete": function(module, attributes, params, callbacks) {
                var method = 'delete';
                var url = this.buildURL(module, method, attributes, params);

                return this.call(method, url, attributes, {}, callbacks);
            },

            /**
             * Searches a module for a specified query.
             * @param {String} module
             * @param {String} query
             * @param {String} fields
             * @param {Object} scallbacks with with callbacks of the format {Success: function(data){}, error: function(data){}}
             */
            search: function(module, query, fields, callbacks) {
                var params = [
                    {key: "q", value: query},
                    {key: "fields", value: fields}
                ];
                var method = 'search';
                var payload = {};
                var url = this.buildURL(module, method, {}, params);

                return this.call('get', url, payload, {}, callbacks);
            },

            /**
             * Performs login.
             *
             * @param  {String} username
             * @param  {String} password
             * @param  {Object} attributes extra properties such as client browser etc
             * @param  {Object} loginCallbacks callbacks hash <code>{ success: function(data){}, error: function(data){} }</code>
             *                on success data will be an object with a token for the session
             * @return ajax request object from this call
             */
            login: function(username, password, attributes, loginCallbacks) {
                attributes = attributes || {};
                // store user callbacks for later
                loginCallbacks = loginCallbacks || {};
                _loginCallbacks = loginCallbacks;

                var payload = _.extend(attributes, {"username": username, "password": password});
                var method = 'create';
                var module = 'login';
                var url = this.buildURL(module, method, attributes, {});
                // use our callbacks on success and error, they will call the stored ones
                var callbacks = {success: handleLoginSuccess, error: handleLoginFailure};

                this.call(method, url, payload, {}, callbacks);
            },

            /**
             * Performs logout.
             *
             * @param  {Object} logoutCallbacks callbacks hash: <code>{ success: function(data){}, error: function(data){} }</code> in success data will be an object with an id of the object being created
             * @return {Object} ajax request obj from this call
             */
            logout: function(logoutCallbacks) {
                // store user callbacks for later
                logoutCallbacks = logoutCallbacks || {};
                _logoutCallbacks = logoutCallbacks;

                var payload = {"token": token};
                var method = 'create';
                var module = 'logout';
                var url = this.buildURL(module, method, payload, {});
                // use our callbacks on success and error, they will call the stored ones
                var callbacks = {success: handleLogoutSuccess, error: handleLogoutFailure};

                return this.call(method, url, payload, {}, callbacks);
            },

            /**
             * Checks if currently authenticated.
             *
             * @return {Boolean} true if authenticated, false otherwise.
             */
            isAuthenticated: function() {
                return isAuth;
            }


        };
    }

    return {
        getInstance: function(args) {
            return instance || init(args);
        }
    };
})();
