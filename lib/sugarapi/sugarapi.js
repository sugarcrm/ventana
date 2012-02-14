//create the SUGAR namespace if one does not exist already
var SUGAR = SUGAR || {};

//create an Api namespace
SUGAR.Api = (function () {
    var instance;
    var methodsToRequest = {
        "get":"GET",
        "update":"PUT",
        "create":"POST",
        "delete":"DELETE"
    };

    function init(args) {
        instance = new SugarApi(args);
        return instance;
    }

    /*
     * This is a constructor for API class
     * @params: pass optional arguments
     */
    function SugarApi(args) {
        var token="";
        var isAuth= false;
        var _loginCallbacks = {};
        var _logoutCallbacks = {};
        function handleLoginSuccess(successObj) {
            isAuth = true;
            if (successObj.token) {
                token = successObj.token;
            }
            if (_loginCallbacks.success) {
                console.log("firing login success callbacks");
                _loginCallbacks.success(successObj);
            }
            console.log("Login success");
        }

        function handleLoginFailure(failObj){
            isAuth = false;
            console.log("Login fail");
            if (_loginCallbacks.error) {
                _loginCallbacks.error(failObj);
            }
        }

        function handleLogoutSuccess(successObj) {
            isAuth = false;
            token="";
            console.log("logout success");

            if (_logoutCallbacks.success) {
                _logoutCallbacks.success(successObj);
            }

        }

        function handleLogoutFailure(failObj){
            isAuth = true;
            console.log("logout fail");

            if (_logoutCallbacks.error) {
                _logoutCallbacks.error(failObj);
            }
        }

        return {
            baseUrl:"rest/v10/",

            /**
             * make ajax call via jquery ajax
             *
             * @param  string request method to make, crud actions map above eg POST, GET, create,
             * @param  string url
             * @param  object attributes will be stringified and set to data eg {first_name:"bob", last_name:"saget"}
             * @param  array  options for request that map directly to the jquery.ajax options
             * @param  object with with callbacks of the format {success: function(data){}, error: function(data){}} to be called
             * @return object jquery Request object
             */
            call:function (method, url, attributes, options, callbacks) {
                options = options || {};
                callbacks = callbacks || {};
                var type = methodsToRequest[method];

                // by default use json headers
                var params = {type:type, dataType:'json'};

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

                // set data for create and update
                if (attributes && (method == 'create' || method == 'update')) {
                    params.contentType = 'application/json';
                    params.data = JSON.stringify(attributes);
                }

                // Don't process data on a non-GET request.
                if (params.type !== 'GET') {
                    params.processData = false;
                }

                // Make the request, allowing override of any Ajax options.
                return $.ajax(_.extend(params, options));

            },


            /**
             * builds urls based on module name action and attributes of the format rooturl/module/id/action
             *
             * @param  string module name
             * @param  string action
             * @param  object attributes of resource being saved eg {name: "bob", id:"123"} id will be taken from here if set
             * @param  array  of objects of the format [{key:"timestamp", value: "NOW"}{key:"fields",value:"first_name"}]
             *         to be added as url params
             * @return obj of sugar fields stored by fieldname.viewtype
             */
            buildURL:function (module, action, attributes, params) {
                var baseActions = ["get", "update", "create", "delete"];
                result = this.baseUrl;
                plist = [];

                if (module) {
                    result += module + '/';
                }

                if (attributes && attributes.id) {
                    result += attributes.id + '/';
                }

                if (action && $.inArray(action, baseActions) == -1) {
                    result += action + '/';
                }

                // concat and add params
                if (params.length > 0) {
                    for (pIndex in params) {
                        plist.push(params[pIndex].key + '=' + params[pIndex].value);
                    }
                    plist = plist.join("&");
                    result += '?' + plist;
                }

                return result;
            },

            getMetadata:function (type, modules, callbacks) {
                var modstring = modules.join(", ");
                var typestring = type.join(", ");
                var params = [
                    {"key":"type", "value":typestring},
                    {"key":"modules", "value":modstring}
                ];
                var method = 'get';
                var module = "metadata";
                var url = this.buildURL(module, method, {}, params);
                return this.call(method, url, {}, {}, callbacks);
            },

            getSugarFields:function (hash, callbacks) {
                var module = 'sugarFields';
                var method = 'get';
                var params = [
                                    {"key":"md5", "value":hash}
                                ];
                var url = this.buildURL(module, method, {}, params);

                return this.call(method, url, {}, {}, callbacks);
            },

            /**
             * gets beans
             *
             * @param  string module name
             * @param  object attribute object with id of bean being gotten eg {id:"123"}, no id will retrieve a list
             * @param  array  of objects of the format [{key:"timestamp", value: "NOW"}{key:"fields",value:"first_name"}]
             *         to be added as url params
             * @param  object with with callbacks of the format {success: function(data){}, error: function(data){}}
             *                in success data will the object being retrieved
             * @return ajax request obj from this call
             */
            get:function (module, attributes, params, callbacks) {
                var method = 'get';
                var url = this.buildURL(module, method, attributes, params);

                return this.call(method, url, attributes, {}, callbacks);
            },

            /**
             * create a bean
             *
             * @param  string module name
             * @param  object attribute object with properties of bean being saved eg {first_name:"bob", last_name"saget"}
             * @param  array  of objects of the format [{key:"timestamp", value: "NOW"}{key:"fields",value:"first_name"}]
             *         to be added as url params
             * @param  object with with callbacks of the format {success: function(data){}, error: function(data){}}
             *                in success data will be an object with an id of the object being created
             * @return ajax request obj from this call
             */
            create:function (module, attributes, params, callbacks) {
                var method = 'create';
                var url = this.buildURL(module, method, attributes, params);

                return this.call(method, url, attributes, {}, callbacks)
            },

            /**
             * update a bean
             *
             * @param  string module name
             * @param  object attribute object with properties of bean being updated eg {first_name:"george", last_name"saget"}
             * @param  array  of objects of the format [{key:"timestamp", value: "NOW"}{key:"fields",value:"first_name"}]
             *         to be added as url params
             * @param  object with with callbacks of the format {success: function(data){}, error: function(data){}}
             *                in success data will be an object with an id of the object being created
             * @return ajax request obj from this call
             */
            update:function (module, attributes, params, callbacks) {
                var method = 'update';
                var url = this.buildURL(module, method, attributes, params);

                return this.call(method, url, attributes, {}, callbacks)
            },

            /**
             * delete a bean
             *
             * @param  string module name
             * @param  object attribute object with id of bean being deleted eg {first_name:"george", last_name"saget"}
             * @param  array  of objects of the format [{key:"timestamp", value: "NOW"}{key:"fields",value:"first_name"}]
             *         to be added as url params
             * @param  object with with callbacks of the format {success: function(data){}, error: function(data){}}
             *                in success data will be an object with an id of the object being created
             * @return ajax request obj from this call
             */
            delete:function (module, attributes, params, callbacks) {
                var method = 'delete';
                var url = this.buildURL(module, method, attributes, params);

                return this.call(method, url, attributes, {}, callbacks)
            },

            /**
             * login
             *
             * @param  string username
             * @param  string password
             * @param  object of extra properties such as client browser etc
             * @param  object with with callbacks of the format {success: function(data){}, error: function(data){}}
             *                in success data will be an object with a token for the session
             * @return ajax request obj from this call
             */
            login:function (user_name, password, attributes, loginCallbacks) {
                // store user callbacks for later
                loginCallbacks = loginCallbacks || {};
                _loginCallbacks = loginCallbacks;

                var payload = _.extend(attributes, {"username":user_name, "password":password});
                var method = 'create';
                var module = 'login';
                var url = this.buildURL(module, method, attributes, {});

                var callbacks = {success: handleLoginSuccess, error: handleLoginFailure};

                this.call(method, url, payload, {}, callbacks);
            },

            /**
             * logout
             *
             * @param  object with with callbacks of the format {success: function(data){}, error: function(data){}}
             *                in success data will be an object with an id of the object being created
             * @return ajax request obj from this call
             */
            logout:function (logoutCallbacks) {
                // store user callbacks for later
                logoutCallbacks = logoutCallbacks || {};
                _logoutCallbacks = logoutCallbacks;

                var payload = {"token": token};
                var method = 'create';
                var module = 'logout';
                var url = this.buildURL(module, method, payload, {});
                var callbacks = {success: handleLogoutSuccess, error: handleLogoutFailure};

                this.call(method, url, payload, {}, callbacks);
            },

            /**
             * checks if currently authenticated
             *
             * @return bool true if auth, false otherwise
             */
            isAuthenticated: function(){
                return isAuth;
            }


        };
    }

    return {
        getInstance:function (args) {
            return instance || init(args);
        }
    }
})();
