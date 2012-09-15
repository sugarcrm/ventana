/*;
 * SugarCRM Javascript API
 */

//create the SUGAR namespace if one does not exist already
var SUGAR = SUGAR || {};

/**
 * SugarCRM Javascript API allows users to interact with SugarCRM instance via its REST interface.
 *
 * Use {@link SUGAR.Api#getInstance} method to create instances of Sugar API.
 * This method accepts arguments object with the following properties:
 * <pre>
 * {
 *   serverUrl: Sugar REST URL end-point
 *   platform: platform name ("portal", "mobile", etc.)
 *   keyValueStore: reference to key/value store provider used to read/save auth token from/to
 *   timeout: request timeout in seconds
 * }
 * </pre>
 *
 * The key/value store provider must implement three methods:
 * <pre><code>
 *   set: void function(String key, String value)
 *   get: String function(key)
 *   cut: void function(String key)
 * </code></pre>
 * The authentication tokens are kept in memory if the key/value store is not specified.
 *
 * Most of Sugar API methods accept `callbacks` object:
 * <pre>
 * {
 *   success: function(data) { },
 *   error: function(error) { },
 *   complete: function() { },
 * }
 * </pre>
 *
 * @class SUGAR.Api
 */
SUGAR.Api = (function() {
    var _instance;
    var _methodsToRequest = {
            "read": "GET",
            "update": "PUT",
            "create": "POST",
            "delete": "DELETE"
        };
    var _baseActions = ["read", "update", "create", "delete"];
    var _numCallsInProgress = 0;

    var HttpError = function(request, textStatus, errorThrown) {

        request = request || {};
        request.xhr = request.xhr || {};

        /**
         * AJAX request that caused the error.
         * @property {SUGAR.HttpRequest}
         * @member SUGAR.HttpError
         */
        this.request = request;

        /**
         * XHR status code.
         * @property {String/Number}
         * @member SUGAR.HttpError
         */
        this.status = request.xhr.status;

        /**
         * XHR response text.
         * @property {String}
         * @member SUGAR.HttpError
         */
        this.responseText = request.xhr.responseText;

        /**
         * String describing the type of error that occurred.
         *
         * Possible values (besides null) are `"timeout"`, `"error"`, `"abort"`, and `"parsererror"`.
         * @property {String}
         * @member SUGAR.HttpError
         */
        this.textStatus = textStatus;

        /**
         * Textual portion of the HTTP status when HTTP error occurs.
         *
         * For example, `"Not Found"` or `"Internal Server Error"`.
         * @property {String}
         * @member SUGAR.HttpError
         */
        this.errorThrown = errorThrown;

        // The response will not be always a JSON string

        if (typeof(this.responseText) === "string" && this.responseText.length > 0) {
            try {
                var contentType = this.request.xhr.getResponseHeader("Content-Type");
                if (contentType && (contentType.indexOf("application/json") === 0)) {
                    var payload = JSON.parse(this.responseText);
                    /**
                     * Error code.
                     *
                     * Additional failure information. See SugarCRM REST API documentation for a full list of error codes.
                     * @property {String}
                     * @member SUGAR.HttpError
                     */
                    this.code = payload.error;

                    /**
                     * Error description.
                     * @property {String}
                     * @member SUGAR.HttpError
                     */
                    this.description = payload.error_description;

                    /**
                     * Error message.
                     *
                     * Localized message appropriate for display to end user.
                     * @property {String}
                     * @member SUGAR.HttpError
                     */
                    this.message = payload.error_message;
                }
            }
            catch(e) {
                // Ignore this error
            }
        }
    };

    /**
     * Represents AJAX error.
     *
     * See Jquery/Zepto documentation for details.
     *
     * - http://api.jquery.com/jQuery.ajax/
     * - http://zeptojs.com/#$.ajax
     *
     * @class SUGAR.HttpError
     */
    _.extend(HttpError.prototype, {

        /**
         * Returns string representation of HTTP error.
         * @return {String} HTTP error as a string.
         * @member SUGAR.HttpError
         */
        toString: function() {
            return "HTTP error: " + this.status +
                "\ntype: " + this.textStatus +
                "\nerror: " + this.errorThrown +
                "\nresponse: " + this.responseText;
        }

    });

    var HttpRequest = function(params, debug) {
        /**
         * Request parameters.
         *
         * See Jquery/Zepto documentation for details.
         *
         * - http://api.jquery.com/jQuery.ajax/
         * - http://zeptojs.com/#$.ajax
         *
         * @property {Object}
         * @member SUGAR.HttpRequest
         */
        this.params = params; // TODO: Consider cloning

        /**
         * Flag indicating that a request must output debug information.
         * @property {Boolean}
         * @member SUGAR.HttpRequest
         */
        this.debug = debug;
    };

    /**
     * Represents AJAX request.
     *
     * Encapsulates XHR object and AJAX parameters.
     * @class SUGAR.HttpRequest
     */
    _.extend(HttpRequest.prototype, {

        /**
         * Executes AJAX request.
         * @param {String} token(optional) OAuth token.
         */
        execute: function(token) {
            if (token) {
                this.params.headers = this.params.headers || {};
                this.params.headers["OAuth-Token"] = token;
            }

            if (this.debug) {
                console.log("====== Ajax Request Begin ======");
                console.log(this.params.type + " " + this.params.url);
                console.log("Payload: ",  this.params.data ? JSON.parse(this.params.data) : "N/A");
                console.log("params: ", this.params);
                console.log("====== Request End ======");
            }
            //In order to keep track of the number of ajax call in the air, we will add
            //a complete callback.
            var origCallback = this.params.complete;
            this.params.complete = function(xhr, status){
                _numCallsInProgress--;
                if (_.isFunction(origCallback))
                    origCallback(xhr, status);
            };
            _numCallsInProgress++;
            /**
             * XmlHttpRequest object.
             * @property {Object}
             * @member SUGAR.HttpRequest
             */
            this.xhr = $.ajax(this.params);

        }

    });

    function SugarApi(args) {
        var _serverUrl, _platform, _keyValueStore, _clientID, _timeout, _refreshingToken;
        var _accessToken = null;
        var _refreshToken = null;

        // if no key/value store is provided, the auth token is kept in memory
        _keyValueStore = args && args.keyValueStore;
        _serverUrl = (args && args.serverUrl) || "/rest/v10";
        _platform = (args && args.platform) || "";
        _clientID = (args && args.clientID) || "sugar";
        _timeout = ((args && args.timeout) || 30) * 1000;
        if (_keyValueStore) {
            if (!$.isFunction(_keyValueStore.set) ||
                !$.isFunction(_keyValueStore.get) ||
                !$.isFunction(_keyValueStore.cut))
            {
                throw new Error("Failed to initialize Sugar API: key/value store provider is invalid");
            }
            _accessToken = _keyValueStore.get("AuthAccessToken");
            _refreshToken = _keyValueStore.get("AuthRefreshToken");
        }

        _refreshingToken = false;

        function _resetAuth(data) {
            // data is the response from the server
            if (data) {
                _accessToken = data.access_token;
                _refreshToken = data.refresh_token;
                if (_keyValueStore) {
                    _keyValueStore.set("AuthAccessToken", _accessToken);
                    _keyValueStore.set("AuthRefreshToken", _refreshToken);
                }
            }
            else {
                _accessToken = null;
                _refreshToken = null;
                if (_keyValueStore) {
                    _keyValueStore.cut("AuthAccessToken");
                    _keyValueStore.cut("AuthRefreshToken");
                }
            }
        }

        return {
            /**
             * Client Id for oAuth
             * @property {String}
             * @member SUGAR.Api
             */
            clientID: _clientID,

            /**
             * URL of Sugar REST end-point.
             * @property {String}
             * @member SUGAR.Api
             */
            serverUrl: _serverUrl,

            /**
             * Flag indicating if API should run in debug mode (console debugging of API calls).
             * @property {Boolean}
             * @member SUGAR.Api
             */
            debug: false,

            /**
             * Makes AJAX call via jquery/zepto AJAX API.
             *
             * @param  {String} method CRUD action to make (read, create, update, delete) are mapped to corresponding HTTP verb: GET, POST, PUT, DELETE.
             * @param  {String} url resource URL.
             * @param  {Object} data(optional) data will be stringified into JSON and set to request body.
             * @param  {Object} callbacks(optional) callbacks object.
             * @param  {Object} options(optional) options for request that map directly to the jquery/zepto Ajax options.
             * @return {SUGAR.HttpRequest} AJAX request.
             * @private
             * @member SUGAR.Api
             */
            call: function(method, url, data, callbacks, options) {
                var i, server, request;
                var type = _methodsToRequest[method];
                var self = this;

                // by default use json headers
                var params = {
                    type: type,
                    dataType: 'json',
                    headers: {},
                    timeout: _timeout
                };

                options = options || {};
                callbacks = callbacks || {};

                // if we dont have a url from options take arg url
                if (!options.url) {
                    params.url = url;
                }

                params.error = function(xhr, textStatus, errorThrown) {
                    var error = new HttpError(request, textStatus, errorThrown);
                    var onError = function() {
                        self.setRefreshingToken(false);
                        // Call original error callback
                        if (callbacks.error) callbacks.error(error);
                    };

                    var refreshFailed = true;
                    if (self.needRefreshAuthToken(request.params.url, error.code)) {
                        self.setRefreshingToken(true);
                        self.login(null, { refresh: true }, {
                            complete: function() {
                                if (refreshFailed) callbacks.complete.apply(this, arguments);
                            },
                            success: function() {
                                refreshFailed = false;
                                self.setRefreshingToken(false);
                                // Repeat original request
                                request.execute(_accessToken);
                            },
                            error: onError
                        });
                    }
                    else {
                        onError();
                    }
                };

                if (callbacks.success) {
                    params.success = callbacks.success;
                }

                if (callbacks.complete) {
                    params.complete = function() {
                        // Do not call complete callback if we are in token refresh loop
                        if (!_refreshingToken) callbacks.complete.apply(this, arguments);
                    }
                }

                if ((method == 'read') && data && data.date_modified) {
                    params.headers["If-Modified-Since"] = data.date_modified;
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

                // Clients may override any of AJAX options.
                request = new HttpRequest(_.extend(params, options), this.debug);
                request.execute(_accessToken);

                if (SUGAR.demoRestServer && SUGAR.restDemoData) {
                    for (i = 0; i < SUGAR.restDemoData.length; i++) {
                        if (SUGAR.restDemoData[i].route.test(url)) {
                            console.log("===Demo Server Responding and Restoring===");
                            server.respond();
                            server.restore();
                        }
                    }
                }

                return request;
            },

            /**
             * Builds URL based on module name action and attributes of the format rooturl/module/id/action.
             *
             * The `attributes` hash must contain `id` of the resource being actioned upon
             * for record CRUD and `relatedId` if the URL is build for relationship CRUD.
             *
             * @param  {String} module module name.
             * @param  {String} action CRUD method.
             * @param  {Object} attributes(optional) object of resource being actioned upon, e.g. `{name: "bob", id:"123"}`.
             * @param  {Object} params(optional) URL parameters.
             * @return {String} URL for specified resource.
             * @private
             * @member SUGAR.Api
             */
            buildURL: function(module, action, attributes, params) {
                params = params || {};
                var parts = [];
                var url;
                parts.push(this.serverUrl);

                if (module) {
                    parts.push(module);
                }

                if ((action != "create") && attributes && attributes.id) {
                    parts.push(attributes.id);
                }

                if (attributes && attributes.link && action != "file") {
                    parts.push('link');
                }

                if (action && $.inArray(action, _baseActions) === -1) {
                    parts.push(action);
                }

                if (attributes && attributes.relatedId) {
                    parts.push(attributes.relatedId);
                }

                if (attributes && action == 'file' && attributes.field) {
                    parts.push(attributes.field);
                }

                url = parts.join("/");

                // URL parameters
                params = $.param(params);
                if (params.length > 0) {
                    url += "?" + params;
                }

                return url;
            },

            /**
             * Builds a file resource URL.
             *
             * @param {Object} attributes Hash with file information.
             *
             * The hash must contain the following properties:
             * <pre>
             * {
             *   module: module name
             *   id: record id
             *   field(optional): Name of the file-type field in the given module
             * }
             * </pre>
             * @param {Object} options(optional) URL options hash.
             *
             * - htmlJsonFormat: Boolean flag indicating if `sugar-html-json` format must be used (`true` by default if `field` property is specified)
             * - passOAuthToken: Boolean flag indicating if OAuth token must be passed in the URL (`true` by default)
             *
             * @return {String} URL for the file resource.
             *
             * Example 1:
             * <pre><code>
             * var url = api.buildFileURL({
             *    module: "Contacts",
             *    id: "123",
             *    field: "picture"
             * });
             *
             * // Returns: http://localhost:8888/sugarcrm/rest/v10/Contacts/123/file/picture?format=sugar-html-json&oauth_token=XYZ
             * </code></pre>
             *
             * The `field` property is optional. If omitted the method returns URL for a list of file resources.
             * Example 2:
             * <pre><code>
             * var url = api.buildFileURL({
             *    module: "Contacts",
             *    id: "123"
             * });
             *
             * // Returns: http://localhost:8888/sugarcrm/rest/v10/Contacts/123/file?oauth_token=XYZ
             * </code></pre>
             * @member SUGAR.Api
             */
            buildFileURL: function(attributes, options) {
                var params = {};
                options = options || {};
                // We only concerned about the format if build URL for an actual file resource
                if (attributes.field && (options.htmlJsonFormat !== false))  {
                    params.format = "sugar-html-json";
                }

                if (options.passOAuthToken !== false) {
                    params.oauth_token = _accessToken;
                }

                return this.buildURL(attributes.module, "file", attributes, params);
            },

            /**
             * Returns the current access token
             */
            getOAuthToken: function() {
                return _accessToken;
            },
            /**
             * Fetches metadata.
             *
             * @param  {String} hash Hash of the current metadata. Used to determine if the metadata is out of date or not.
             * @param  {Array} types(optional) array of metadata types, e.g. `['vardefs','detailviewdefs']`.
             * @param  {Array} modules(optional) array of module names, e.g. `['accounts','contacts']`.
             * @param  {Object} callbacks(optional) callback object.
             * @return {SUGAR.HttpRequest} AJAX request.
             * @member SUGAR.Api
             */
            getMetadata: function(hash, types, modules, callbacks, options) {
                options = options || {};
                var params = options.params || {}, method, url;

                if (types) {
                    params.type_filter = types.join(",");
                }

                if (modules) {
                    params.module_filter = modules.join(",");
                }

                if (_platform) {
                    params.platform = _platform;
                }

                params._hash = hash;

                method = 'read';

                if (options && options.getPublic) {
                    method = 'public';
                }

                url = this.buildURL("metadata", method, null, params);

                return this.call(method, url, null, callbacks);
            },

            /**
             * Executes CRUD on records.
             *
             * @param {String} method operation type: create, read, update, or delete.
             * @param {String} module module name.
             * @param {Object} data request object. If it contains id, action, link, etc., URI will be adjusted accordingly.
             * If methods parameter is 'create' or 'update', the data object will be put in the request body payload.
             * @param {Object} params(optional) URL parameters.
             * @param {Object} callbacks(optional) callback object.
             * @return {SUGAR.HttpRequest} AJAX request.
             * @member SUGAR.Api
             */
            records: function(method, module, data, params, callbacks) {
                var url = this.buildURL(module, method, data, params);
                return this.call(method, url, data, callbacks);
            },

            /**
             * Executes CRUD on relationships.
             *
             * The data paramerer represents relationship information:
             * <pre>
             * {
             *    id: record ID
             *    link: relationship link name
             *    relatedId: ID of the related record
             *    related: object that contains request payload (related record or relationship fields)
             * }
             * </pre>
             *
             * @param {String} method operation type: create, read, update, or delete.
             * @param {String} module module name.
             * @param {Object} data object with relationship information.
             * @param {Object} params(optional) URL parameters.
             * @param {Object} callbacks(optional) callback object.
             * @return {SUGAR.HttpRequest} AJAX request.
             * @member SUGAR.Api
             */
            relationships: function(method, module, data, params, callbacks) {
                var url = this.buildURL(module, data.link, data, params);
                return this.call(method, url, data.related, callbacks);
            },

            /**
             * Executes CRUD on a file resource.
             *
             * @param {String} method operation type: create, read, update, or delete.
             * @param {Object} data object with file information.
             * <pre>
             * {
             *   module: module name
             *   id: model id
             *   field: Name of the file-type field.
             * }
             * </pre>
             * The `field` property is optional. If not specified, the API fetches the file list.
             * @param {Object} $files(optional) jQuery/Zepto DOM elements that carry the files to upload.
             * @param {Object} callbacks(optional) callback object.
             * @param {Object} options(optional) Request options hash.
             *
             * - htmlJsonFormat: Boolean flag indicating if `sugar-html-json` format must be used (`true` by default)
             * - passOAuthToken: Boolean flag indicating if OAuth token must be passed in the URL (`true` by default)
             * - iframe: Boolean flag indicating if iframe transport is used (`true` by default)
             *
             * @return {SUGAR.HttpRequest} AJAX request.
             * @member SUGAR.Api
             */
            file: function(method, data, $files, callbacks, options) {
                var ajaxParams = {
                    files: $files,
                    processData: false
                };

                if (!options || options.iframe !== false) {
                    ajaxParams.iframe = true;
                }

                return this.call(method, this.buildFileURL(data, options),
                    null, callbacks, ajaxParams);
            },

            /**
             * Searches for specified query.
             * @param {Object} params properties: q, module_list, fields, max_num, offset. The query property is required.
             * { q: query, module_list: commaDelitedModuleList, fields: commaDelimitedFields, max_num: 20 },
             * @param {Object} callbacks hash with with callbacks of the format {success: function(data){}, error: function(data){}}
             * @return {SUGAR.HttpRequest} AJAX request.
             * @member SUGAR.Api
             */
            search: function(params, callbacks) {
                var url = this.buildURL(null, "search", null, params);
                return this.call('read', url, null, callbacks);
            },

            /**
             * Performs login.
             *
             * Credentials:
             * <pre>
             *     username: user's login name or email,
             *     password: user's password in clear text
             * </pre>
             *
             * @param  {Object} credentials user credentials.
             * @param  {Object} data(optional) extra data to be passed in login request such as client user agent, etc.
             * @param  {Object} callbacks(optional) callback object.
             * @return {SUGAR.HttpRequest} AJAX request.
             * @member SUGAR.Api
             */
            login: function(credentials, data, callbacks) {
                var payload, success, error, method, url;

                credentials = credentials || {};
                callbacks = callbacks || {};
                
                success = function(data) {
                    _resetAuth(data);
                    if (callbacks.success) callbacks.success(data);
                };

                error = function(error) {
                    _resetAuth();
                    if (callbacks.error) callbacks.error(error);
                };

                if(data && data.refresh) {
                    payload = {
                        grant_type:"refresh_token",
                        client_id: this.clientID,
                        client_secret:"",
                        refresh_token: _refreshToken
                    };
                } else {
                    payload = {
                        grant_type:"password",
                        username: credentials.username,
                        password: credentials.password,
                        client_id: this.clientID,
                        client_secret:""
                    };
                    payload.client_info = data;
                }
                
                method = 'create';
                url = this.buildURL("oauth2", "token", payload);
                return this.call(method, url, payload, {
                    success: success,
                    error: error,
                    complete: callbacks.complete
                });
            },

            /**
             * Executes CRUD on user profile.
             *
             * @param {String} method operation type: read or update (reserved for the future use).
             * @param {Object} data(optional) user profile object.
             * @param {Object} params(optional) URL parameters.
             * @param {Object} callbacks(optional) callback object.
             * @return {SUGAR.HttpRequest} AJAX request.
             * @member SUGAR.Api
             */
            me: function(method, data, params, callbacks) {
                var url = this.buildURL("me", method, data, params);
                return this.call(method, url, data, callbacks);
            },

            /**
             * Makes a call to the CSS Api
             *
             * @param {String} platform
             * @param {Object} themeName
             * @param {Object} callbacks(optional) callback object.
             * @return {SUGAR.HttpRequest} AJAX request.
             */
            css: function(platform, themeName, callbacks) {
                var params = {
                    platform : platform,
                    themeName : themeName
                };
                var url = this.buildURL("css", "read", {}, params);
                return this.call("read", url, {}, callbacks);
            },

            /**
             * Performs logout.
             *
             * @param {Object} callbacks(optional) callback object.
             * @return {SUGAR.HttpRequest} AJAX request.
             * @member SUGAR.Api
             */
            logout: function(callbacks) {
                callbacks = callbacks || {};
                var payload = { "token": _accessToken };
                var url = this.buildURL("oauth2", "logout", payload);
               
                var originalComplete = callbacks.complete;
                callbacks.complete = function() {
                    _resetAuth();
                    if (originalComplete) originalComplete();
                };      

                return this.call('create', url, payload, callbacks);
            },

            /**
             * Performs signup.
             *
             * TODO: The signup action needs another endpoint to allow a guest to signup
             *
             * @param  {Object} contactData user profile.
             * @param  {Object} data(optional) extra data to be passed in login request such as client user agent, etc.
             * @param  {Object} callbacks(optional) callback object.
             * @return {SUGAR.HttpRequest} AJAX request.
             * @member SUGAR.Api
             */
            signup: function(contactData, data, callbacks) {
                var payload = contactData;
                payload.client_info = data;

                var method = 'create';
                var url = this.buildURL("Leads", "register", payload);
                return this.call(method, url, payload, callbacks);
            },


            /**
             * Verify password
             *
             * @param  {Object} password the password to verify
             * @param  {Object} callbacks(optional) callback object.
             * @return {SUGAR.HttpRequest} AJAX request.
             * @member SUGAR.Api
             */
            verifyPassword: function(password, callbacks) {
                var payload = {
                    password_to_verify: password 
                };
                var method = 'create'; //POST so we don't require query params
                var url = this.buildURL("me/password", method);
                return this.call(method, url, payload, callbacks);
            },

            /**
             * Update password
             *
             * @param  {Object} password the new password 
             * @param  {Object} password the new password 
             * @param  {Object} callbacks(optional) callback object.
             * @return {SUGAR.HttpRequest} AJAX request.
             * @member SUGAR.Api
             */
            updatePassword: function(oldPassword, newPasword, callbacks) {
                var payload = {
                    new_password: newPasword,
                    old_password: oldPassword
                };
                var method = 'update';
                var url = this.buildURL("me/password", method);
                return this.call(method, url, payload, callbacks);
            },

            /**
             * Fetches server information.
             * @param {Object} callbacks(optional) callback object.
             * @return {SUGAR.HttpRequest} AJAX request.
             * @member SUGAR.Api
             */
            info: function(callbacks) {
                var url = this.buildURL("ServerInfo");
                return this.call("read", url, null, callbacks);
            },

            /**
             * Checks if API instance is currently authenticated.
             *
             * @return {Boolean} true if authenticated, false otherwise.
             * @member SUGAR.Api
             */
            isAuthenticated: function() {
                return typeof(_accessToken) === "string" && _accessToken.length > 0;
            },

            /**
             * Checks if authentication token can and needs to be refreshed.
             * @param {String} url URL of the failed request.
             * @param {String} errorCode Failure code.
             * @return {Boolean} `true` if the OAuth2 access token can be refreshed, `false` otherwise.
             * @member SUGAR.Api
             * @private
             */
            needRefreshAuthToken: function(url, errorCode) {
                return (_refreshingToken !== true) &&
                    (typeof(_refreshToken) === "string" && _refreshToken.length > 0) &&
                    (url.indexOf("/oauth2/") < 0) &&    // must not be auth request
                    (errorCode === "invalid_grant");    // means access token got expired or invalid
            },

            /**
             * Sets a flag indicating that this API instance is in the process of authentication token refresh.
             * @param {Boolean} flag Flag indicating if token refresh is in progess (`true`).
             * @member SUGAR.Api
             * @private
             */
            setRefreshingToken: function(flag) {
                _refreshingToken = flag;
            }
        };
    }

    return {
        /**
         * Gets an instance of Sugar API class.
         * @param args
         * @return {SUGAR.Api} an instance of Sugar API class.
         * @member SUGAR.Api
         * @static
         */
        getInstance: function(args) {
            return _instance || this.createInstance(args);
        },

        /**
         * Creates a new instance of Sugar API class.
         * @param args
         * @return {SUGAR.Api} a new instance of Sugar API class.
         * @member SUGAR.Api
         * @static
         */
        createInstance: function(args) {
            _instance = new SugarApi(args);
            return _instance;
        },

        getCallsInProgressCount:function(){
            return _numCallsInProgress;
        },

        HttpError: HttpError,
        HttpRequest: HttpRequest

    };

})();
