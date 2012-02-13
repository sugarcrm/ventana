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
        return {
            baseUrl:"rest/v10/",

            //Method to construct the ajax request
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

                // Make the request, allowing the user to override any Ajax options.
                return $.ajax(_.extend(params, options));

            },


            /**
             * builds urls based on module name action and attributes
             *
             * @param  string module name
             * @param  string action
             * @param  object attributes of resource being saved eg {name: "bob", id:"123"}
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
                console.log("metadata url");
                console.log(url);
                return this.call(method, url, {}, {}, callbacks)
            },

            getSugarFields: function(hash, callbacks) {
                return false;
            },

            get:function (module, attributes, params, callbacks) {
                var method = 'get';
                var url = this.buildURL(module, method, attributes, params);

                return this.call(method, url, attributes, {}, callbacks)
            },

            create:function (module, attributes, params, callbacks) {
                var method = 'create';
                var url = this.buildURL(module, method, attributes, params);

                return this.call(method, url, attributes, {}, callbacks)
            },

            update:function (module, attributes, params, callbacks) {
                var method = 'update';
                var url = this.buildURL(module, method, attributes, params);

                return this.call(method, url, attributes, {}, callbacks)
            },

            delete:function (module, attributes, params, callbacks) {
                var method = 'delete';
                var url = this.buildURL(module, method, attributes, params);

                return this.call(method, url, attributes, {}, callbacks)
            },

            login:function (user_name, password, attributes, callbacks) {
                var payload = _.extend(attributes, {"username":user_name, "password":password});
                var method = 'create';
                var module = 'login';
                var url = this.buildURL(module, method, attributes, {});
                return this.call(method, url, payload, {}, callbacks);
            },

            logout:function (callbacks) {
                var payload = {};
                var method = 'create';
                var module = 'logout';
                var url = this.buildURL(module, method, payload, {});
                return this.call(method, url, payload, {}, callbacks);
            }


        };
    }

    return {
        getInstance:function (args) {
            return instance || init(args);
        }
    }
})();
