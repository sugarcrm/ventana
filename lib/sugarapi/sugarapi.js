/*
 * SugarCRM Javascript API
 */

//create the SUGAR namespace if one does not exist already
var SUGAR = SUGAR || {};

/**
 * SugarCRM Javascript API allows users to interact with SugarCRM instance via its REST interface.
 * @class SugarApi
 * @singleton
 * @alias SUGAR.Api
 */
SUGAR.Api = (function() {
    var _instance,
        _methodsToRequest = {
            "read": "GET",
            "update": "PUT",
            "create": "POST",
            "delete": "DELETE"
        },
        _baseActions = ["read", "update", "create", "delete"];

    /**
     * Private method to retreive / insstantiate instance of sugar API
     * @private
     * @param args
     * @return {Object} Instance
     */
    function init(args) {
        _instance = new SugarApi(args);
        return _instance;
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
             * Makes AJAX call via jquery/zepto AJAX API.
             *
             * @param  {String} method CRUD action to make (read, create, update, delete) are mapped to corresponding HTTP verb: GET, POST, PUT, DELETE.
             * @param  {String} url resource URL
             * @param  {Object} data(optional) data will be stringified into JSON and set to data, e.g. {first_name:"bob", last_name:"saget"}
             * @param  {Object} callbacks(optional) hash with callbacks of the format <code>{success: function(data){}, error: function(data){}}</code>
             * @param  {Array}  options(optional) options for request that map directly to the jquery.ajax options
             * @return {Object} Jquery request object
             * @private
             */
            call: function(method, url, data, callbacks, options) {
                var i, server;
                var type = _methodsToRequest[method];

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
                if (data && (method == 'create' || method == 'update')) {
                    params.contentType = 'application/json';
                    params.data = JSON.stringify(data);
                }

                // Don't process data on a non-GET request.
                if (params.type !== 'GET') {
                    params.processData = false;
                }

                if (this.debug) {
                    console.log("====== Ajax Request Begin ======");
                    console.log("Request URL: " + url);
                    console.log("Request Type: " + type);
                    console.log("Payload: ", data);
                    console.log("options: ", params);
                    console.log("callbacks: ", callbacks);
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
             * Builds URLs based on module name action and attributes of the format rooturl/module/id/action.
             *
             * @param  {String} module module name
             * @param  {String} action CRUD method
             * @param  {Object} attributes(optional) object of resource being actioned upon, e.g. <code>{name: "bob", id:"123"}</code>. Resource ID will be taken from here if set.
             * @param  {Array}  params(optional) array of objects of the format below to be added as url params
             *         <code>[{key:"timestamp", value: "NOW"}{key:"fields",value:"first_name"}]</code>
             * @return {String} url URL for specified resource
             * @private
             */
            buildURL: function(module, action, attributes, params) {
                var resultArray = [];
                var result;
                var plist = [];
                resultArray.push(this.baseUrl);

                if (module) {
                    resultArray.push(module);
                }

                if ((action != "create") && attributes && attributes.id) {
                    resultArray.push(attributes.id);
                }

                if (action && _baseActions.indexOf(action) == -1) {
                    resultArray.push(action);
                }

                if (attributes && attributes.relatedId) {
                    resultArray.push(attributes.relatedId);
                }

                result = resultArray.join("/");

                // concat and add params
                if (params) {
                    for (var param in params) {
                        if (params.hasOwnProperty(param)) {
                            plist.push(param + '=' + encodeURIComponent(params[param]));
                        }
                    }

                    if (plist.length > 0) {
                        plist = plist.join("&");
                        result += '?' + plist;
                    }
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
                var params = {
                    "type": type.join(","),
                    "filter": modules.join(",")
                };
                var method = 'read';
                var module = "metadata";
                var url = this.buildURL(module, method, null, params);
                return this.call(method, url, null, callbacks);
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
                var method = 'read';
                var params = {
                    "md5": hash
                };
                var url = this.buildURL(module, method, null, params);

                return this.call(method, url, null, callbacks);
            },

            /**
             * Executes CRUD on beans.
             *
             * @param {String} method operation type: create, read, update, or delete
             * @param {String} module module name
             * @param data object to pass in the request body
             * @param params(optional) URL parameters
             * @param callbacks(optional) object with <code>success</code> and <code>error</code> callback functions
             */
            beans: function(method, module, data, params, callbacks) {
                var url = this.buildURL(module, method, data, params);
                return this.call(method, url, data, callbacks);
            },

            /**
             * Executes CRUD on relationships.
             *
             * The data paramerer represents relationship information:
             * <pre>
             * {
             *    id: bean ID
             *    link: relationship link name
             *    relatedId: ID of the related bean
             *    related: object that contains request payload (related bean or relationship fields)
             * }
             * </pre>
             *
             * @param {String} method operation type: create, read, update, or delete
             * @param {String} module module name
             * @param data object with relationship information
             * @param params(optional) URL parameters
             * @param callbacks(optional) object with <code>success</code> and <code>error</code> callback functions
             */
            relationships: function(method, module, data, params, callbacks) {
                var url =  this.buildURL(module, data.link, data, params);
                return this.call(method, url, data.related, callbacks);
            },

            /**
             * Searches a module for a specified query.
             * @param {String} module
             * @param {String} query
             * @param {String} fields
             * @param {Object} callbacks hash with with callbacks of the format {Success: function(data){}, error: function(data){}}
             */
            search: function(module, query, fields, callbacks) {
                var params = {
                    "q": query,
                    "fields": fields
                };
                var method = 'search';
                var payload = {};
                var url = this.buildURL(module, method, null, params);

                return this.call('read', url, payload, callbacks);
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
                var url = this.buildURL(module, method, attributes);
                // use our callbacks on success and error, they will call the stored ones
                var callbacks = {success: handleLoginSuccess, error: handleLoginFailure};

                this.call(method, url, payload, callbacks);
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
                var url = this.buildURL(module, method, payload);
                // use our callbacks on success and error, they will call the stored ones
                var callbacks = {success: handleLogoutSuccess, error: handleLogoutFailure};

                return this.call(method, url, payload, callbacks);
            },

            /**
             * Checks if currently authenticated.
             *
             * @return {Boolean} true if authenticated, false otherwise.
             */
            isAuthenticated: function() {
                return isAuth;
            },

          getToken: function() {
              return token;
          },

          setToken: function(value) {
            if (value != "") {
              handleLoginSuccess({token: value});
            }
          }
        };
    }

    return {
        getInstance: function(args) {
            return _instance || init(args);
        }
    };
})();
