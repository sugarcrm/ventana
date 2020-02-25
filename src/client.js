/*
 * Copyright (c) 2017 SugarCRM Inc. Licensed by SugarCRM under the Apache 2.0 license.
 */

var _instance;
var _methodsToRequest = {
        'read': 'GET',
        'update': 'PUT',
        'create': 'POST',
        'delete': 'DELETE'
    };
var _baseActions = ['read', 'update', 'create', 'delete'];
var _refreshTokenSuccess = function(c) {c();};
var _bulkQueues = { };
var _state = { };

/**
 * Represents AJAX error.
 *
 * See Jquery/Zepto documentation for details.
 * @see  http://api.jquery.com/jQuery.ajax/
 * @see  http://zeptojs.com/#$.ajax
 *
 * @class HttpError
 */
var HttpError = function(request, textStatus, errorThrown) {

    request = request || {};
    request.xhr = request.xhr || {};

    /**
     * AJAX request that caused the error.
     *
     * @member {HttpError} request
     * @memberof HttpError
     * @instance
     */
    this.request = request;

    /**
     * XHR status code.
     *
     * @member {string} status
     * @memberof HttpError
     * @instance
     */
    this.status = request.xhr.status;

    /**
     * XHR response text.
     *
     * @member {string} responseText
     * @memberof HttpError
     * @instance
     */
    this.responseText = request.xhr.responseText;

    /**
     * String describing the type of error that occurred.
     *
     * Possible values (besides null) are `"timeout"`, `"error"`, `"abort"`, and
     *   `"parsererror"`.
     * @member {string} textStatus
     * @memberof HttpError
     * @instance
     */
    this.textStatus = textStatus;

    /**
     * Textual portion of the HTTP status when HTTP error occurs.
     *
     * For example, `"Not Found"` or `"Internal Server Error"`.
     * @member {string} errorThrown
     * @memberof HttpError
     * @instance
     */
    this.errorThrown = errorThrown;

    // The response will not be always a JSON string

    if (typeof(this.responseText) === 'string' && this.responseText.length > 0) {
        try {
            var contentType = this.request.xhr.getResponseHeader('Content-Type');
            if (contentType && (contentType.indexOf('application/json') === 0)) {
                this.payload = JSON.parse(this.responseText);
                /**
                 * Error code.
                 *
                 * Additional failure information. See SugarCRM REST API
                 * documentation for a full list of error codes.
                 * @member {string} code
                 * @memberof HttpError
                 * @instance
                 */
                this.code = this.payload.error;

                /**
                 * Error message.
                 *
                 * Localized message appropriate for display to end user.
                 * @member {string} message
                 * @memberof HttpError
                 * @instance
                 */
                this.message = this.payload.error_message;
            }
        }
        catch (e) {
            // Ignore this error
        }
    }
};

_.extend(HttpError.prototype, {

    /**
     * Returns string representation of HTTP error.
     *
     * @return {string} HTTP error as a string.
     * @memberof HttpError
     * @instance
     */
    toString: function() {
        return 'HTTP error: ' + this.status +
            '\ntype: ' + this.textStatus +
            '\nerror: ' + this.errorThrown +
            '\nresponse: ' + this.responseText +
            '\ncode: ' + this.code +
            '\nmessage: ' + this.message;
    }

});

/**
 * Represents AJAX request.
 *
 * Encapsulates XHR object and AJAX parameters.
 *
 * @class HttpRequest
 */
var HttpRequest = function(params, debug) {
    /**
     * Request parameters.
     *
     * See Jquery/Zepto documentation for details.
     *
     * - http://api.jquery.com/jQuery.ajax/
     * - http://zeptojs.com/#$.ajax
     *
     * @member {Object} params
     * @memberof HttpRequest
     * @instance
     */
    this.params = params; // TODO: Consider cloning

    /**
     * Flag indicating that a request must output debug information.
     *
     * @member {boolean} debug
     * @memberof HttpRequest
     * @instance
     */
    this.debug = debug;

    /**
     * The state object is used to store global enviroment conditions that may
     * be relevant when processing this request but would not be passed to the
     * server.
     *
     * @member {Object} state
     * @memberof HttpRequest
     * @instance
     */
    this.state = {};
};

_.extend(HttpRequest.prototype, {

    /**
     * Executes AJAX request.
     *
     * @param {string} token OAuth token. Must not be supplied for login
     *   type requests.
     * @param {string} mdHash current private metadata hash, used to
     *   validate the client metadata against the server.
     * @param {string} upHash Current User preferences hash, used to
     *   validate the client user pref data against the server.
     * @memberof HttpRequest
     * @instance
     */
    execute: function(token, mdHash, upHash) {
        if (token) {
            this.params.headers = this.params.headers || {};
            this.params.headers['OAuth-Token'] = token;
        }
        if (mdHash) {
            this.params.headers = this.params.headers || {};
            this.params.headers['X-Metadata-Hash'] = mdHash;
        }
        if (upHash) {
            this.params.headers = this.params.headers || {};
            this.params.headers['X-Userpref-Hash'] = upHash;
        }

        //The state object is used to store global enviroment conditions that may be relevent
        //when processing this request but would not be passed to the server.
        this.state = _.extend(this.state, _state);

        if (this.debug) {
            console.log('====== Ajax Request Begin ======');
            console.log(this.params.type + ' ' + this.params.url);
            var parsedData = this.params.data ? JSON.parse(this.params.data) : null;
            if (parsedData && parsedData.password) parsedData.password = '***';
            console.log('Payload: ', this.params.data ? parsedData : 'N/A');
            var p = $.extend({}, this.params);
            delete p.data;
            console.log('params: ', p);
            console.log('====== Request End ======');
        }

        /**
         * XmlHttpRequest object.
         *
         * @member {XMLHttpRequest} xhr
         * @memberof HttpRequest
         * @instance
         */
        this.xhr = $.ajax(this.params);
    }
});

/**
 * Fake jqXHR object because bulk calls do not have their own individual XHR
 * requests.
 *
 * @param {object} result object returned from the BulkAPI
 * @param {string|number} [result.status=200] The response status.
 * @param {Object} [result.status=200] The response headers.
 * @param {Object} [result.contents={}] The response contents.
 * @param {HttpRequest} parentReq bulk API request that this request is a part of.
 */
var bulkXHR = function(result, parentReq) {
    var contents = result.contents || {};

    this.status = result.status || 200;
    this.statusText = result.status_text || '';
    this.responseText = _.isObject(contents) ? JSON.stringify(contents) : contents;
    this.readyState = 4;
    this._parent = parentReq.xhr;
    this.headers = result.headers;
};

_.extend(bulkXHR.prototype, {
    isResolved: function() {
        return this._parent.isResolved();
    },
    getResponseHeader: function(h) {
        return this.headers[h];
    },
    getAllResponseHeaders: function() {
        return _.reduce(this.headers, function(str, value, key) {
            return str.concat(key + ': ' + value + '\n');
        }, '');
    }
});

/**
 * The SugarCRM JavaScript API allows users to interact with SugarCRM instance
 * via its REST interface.
 *
 * Most Sugar API methods accept `callbacks` object:
 * ```
 * {
 *     success: function(data) {},
 *     error: function(error) {},
 *     complete: function() {},
 * }
 * ```
 *
 * @param {Object} args The configuration parameters for the instance.
 * @param {string} [args.serverUrl='/rest/v10'] Sugar REST URL end-point.
 * @param {string} [args.platform=''] Platform name ("portal", "mobile", etc.).
 * @param {Object} [args.keyValueStore] Reference to key/value store provider used
 *   to read/save auth token from/to. It must implement three methods:
 *   ```
 *   set: void function(String key, String value)
 *   get: String function(key)
 *   cut: void function(String key)
 *   ```
 *   The authentication tokens are kept in memory if the key/value store is not
 *   specified.
 * @param {number} [args.timeout] Request timeout in seconds.
 * @param {Function} [args.defaultErrorHandler] The default error handler.
 * @param {string} [args.clientID='sugar'] The clientID for oAuth.
 * @param {boolean} [args.disableBulkApi]
 * @param {Function} [args.externalLoginUICallback] The callback to be called if
 *  external login is activated.
 *
 * @class Api
 */
function SugarApi(args) {
    var _serverUrl,
        _platform,
        _keyValueStore,
        _clientID,
        _timeout,
        _refreshingToken,
        _defaultErrorHandler,
        _externalLogin,
        _allowBulk,
        _externalLoginUICallback = null,
        _accessToken = null,
        _refreshToken = null,
        _downloadToken = null,
        // request queue
        // used to support multiple request while in refresh token loop
        _rqueue = [],
        // dictionary of currently executed requests (keys are IDs)
        _requests = {},
        // request unique ID (counter)
        _ruid = 0;

    // if no key/value store is provided, the auth token is kept in memory
    _keyValueStore = args && args.keyValueStore;
    _serverUrl = (args && args.serverUrl) || '/rest/v10';
    // there will only be a fallback default error handler if provided here
    _defaultErrorHandler = (args && args.defaultErrorHandler) || null;
    _platform = (args && args.platform) || '';
    _clientID = (args && args.clientID) || 'sugar';
    _timeout = ((args && args.timeout) || 30) * 1000;
    _externalLogin = false;
    _allowBulk = !(args && args.disableBulkApi);

    if (args && args.externalLoginUICallback && _.isFunction(args.externalLoginUICallback)) {
        _externalLoginUICallback = args.externalLoginUICallback;
    }

    if (_keyValueStore) {
        if (!$.isFunction(_keyValueStore.set) ||
            !$.isFunction(_keyValueStore.get) ||
            !$.isFunction(_keyValueStore.cut))
        {
            throw new Error('Failed to initialize Sugar API: key/value store provider is invalid');
        }

        var init = function() {
            _accessToken = _keyValueStore.get('AuthAccessToken');
            _refreshToken = _keyValueStore.get('AuthRefreshToken');
            _downloadToken = _keyValueStore.get('DownloadToken');
        };

        if ($.isFunction(_keyValueStore.initAsync)) {
            _keyValueStore.initAsync(init);
        } else {
            init();
        }

        if ($.isFunction(_keyValueStore.on)) {
            _keyValueStore.on('cache:clean', function(callback) {
                callback(['AuthAccessToken', 'AuthRefreshToken', 'DownloadToken']);
            });
        }
    }

    _refreshingToken = false;

    var _resetAuth = function(data) {
        // data is the response from the server
        if (data) {
            _accessToken = data.access_token;
            _refreshToken = data.refresh_token;
            _downloadToken = data.download_token;
            if (_keyValueStore) {
                _keyValueStore.set('AuthAccessToken', _accessToken);
                _keyValueStore.set('AuthRefreshToken', _refreshToken);
                _keyValueStore.set('DownloadToken', _downloadToken);
            }
        } else {
            _accessToken = null;
            _refreshToken = null;
            _downloadToken = null;
            if (_keyValueStore) {
                _keyValueStore.cut('AuthAccessToken');
                _keyValueStore.cut('AuthRefreshToken');
                _keyValueStore.cut('DownloadToken');
            }
        }
    };

    var _handleErrorAndRefreshToken = function(self, request, callbacks) {
        return function(xhr, textStatus, errorThrown) {
            // Don't handle aborted request as error
            if (xhr.aborted || request.aborted) {
                return;
            }
            var error = new HttpError(request, textStatus, errorThrown);
            var onError = function() {
                // Either regular request failed or token refresh failed
                // Call original error callback
                if (!_rqueue.length || self.refreshingToken(request.params.url) || !self.isRequestInQueue(request)) {
                    if (callbacks.error) {
                        callbacks.error(error);
                    }
                    else if ($.isFunction(self.defaultErrorHandler)) {
                        self.defaultErrorHandler(error);
                    }
                } else {
                    // Token refresh failed
                    // Call original error callback for all queued requests
                    for (var i = 0; i < _rqueue.length; ++i) {
                        if (_rqueue[i]._oerror) _rqueue[i]._oerror(error);
                    }
                }
                // duplicated due to other types of authentication
                self.setRefreshingToken(false);
            };

            var r, refreshFailed = true;
            if (self.needRefreshAuthToken(request.params.url, error.code)) {
                //If we were unloading the queue when we got another 401, we should stop before we get into a loop
                if (request._dequeuing) {
                    if (request._oerror) request._oerror(error);
                    //The tokens we have are bad, nuke them.
                    self.resetAuth();
                    return;
                }
                _rqueue.push(request);

                self.setRefreshingToken(true);

                var refreshCallbacks = {
                    complete: function() {

                        // Call original complete callback for all queued requests
                        // only if token refresh failed
                        // In case of requests succeed, complete callback is called by ajax lib
                        if (refreshFailed) {
                            r = _rqueue.shift();
                            while (r) {
                                if (r._ocomplete) {
                                    r._ocomplete.call(this, r);
                                }
                                r = _rqueue.shift();
                            }
                        }
                    },
                    success: function() {
                        self.setRefreshingToken(false);
                        refreshFailed = false;
                        _refreshTokenSuccess(function() {
                            // Repeat original requests
                            r = _rqueue.shift();
                            while (r) {
                                r._dequeuing = true;
                                r.execute(self.getOAuthToken());
                                r = _rqueue.shift();
                            }
                        });
                    },
                    error: onError
                };

                if (!('crosstab' in window) || !crosstab.supported) {
                    self.login(null, {refresh: true}, {
                        complete: refreshCallbacks.complete,
                        success: refreshCallbacks.success,
                        error: refreshCallbacks.error
                    });
                    return;
                }

                crosstab(function() {
                    crosstab.on('auth:refresh:complete', function(event) {
                        var status = event.data;
                        switch (status) {
                            case 'success':
                                refreshCallbacks.success();
                                break;
                            case 'error':
                                refreshCallbacks.error();
                                break;
                            case 'complete':
                                refreshCallbacks.complete();
                                crosstab.off('auth:refresh:complete');
                                break;
                        }
                    });

                    crosstab.broadcastMaster('auth:refresh');
                });

            } else if (self.needQueue(request.params.url)) {
                // Queue subsequent request to execute it after token refresh completes
                _rqueue.push(request);
            } else if (_externalLogin && error.status == 401 && error.payload &&
                error.payload.url && error.payload.platform == _platform
            ) {
                self.handleExternalLogin(request, error, onError);
            } else {
                onError();
            }
        };
    };

    return {
        /**
         * Client Id for oAuth.
         *
         * @type {string}
         * @memberOf Api
         * @instance
         */
        clientID: _clientID,

        /**
         * URL of Sugar REST end-point.
         *
         * @type {string}
         * @memberOf Api
         * @instance
         */
        serverUrl: _serverUrl,

        /**
         * Default fallback HTTP error handler. Used when api.call
         * is not supplied with an error: function in callbacks parameter.
         *
         * @type {Function}
         * @memberOf Api
         * @instance
         */
        defaultErrorHandler: _defaultErrorHandler,

        /**
         * Request timeout (in milliseconds).
         *
         * @type {number}
         * @memberOf Api
         * @instance
         */
        timeout: _timeout,

        /**
         * Flag indicating if API should run in debug mode (console debugging
         * of API calls).
         *
         * @type {boolean}
         * @memberOf Api
         * @instance
         */
        debug: false,

        /**
         * Aborts a request by ID.
         *
         * @param {string} id Request ID
         * @memberOf Api
         * @instance
         */
        abortRequest: function(id) {
            var request = _requests[id];

            if (request) {
                request.aborted = true;
                if (request.xhr) {
                    request.xhr.aborted = true;
                    request.xhr.abort();
                }
            }
        },

        /**
         * Gets request by ID.
         *
         * @param {string} id Request ID
         * @memberOf Api
         * @instance
         */
        getRequest: function(id) {
            return _requests[id];
        },

        /**
         * Sets the callback to be triggered after a token refresh occurs.
         *
         * @param callback function to be called
         * @memberOf Api
         * @instance
         */
        setRefreshTokenSuccessCallback: function(callback) {
            if (_.isFunction(callback))
                _refreshTokenSuccess = callback;
        },

        /**
         * Makes AJAX call via jQuery/Zepto AJAX API.
         *
         * @param {string} method CRUD action to make (read, create, update,
         *   delete) are mapped to corresponding HTTP verb: GET, POST, PUT, DELETE.
         * @param {string} url resource URL.
         * @param {FormData|Object} [data] Request body contents. If not given as FormData,
         *   will be stringified into JSON.
         * @param {Object} [callbacks] callbacks object.
         * @param {Object} [options] options for request that map
         *   directly to the jquery/zepto Ajax options.
         * @return {HttpRequest} AJAX request.
         * @memberOf Api
         * @instance
         */
        call: function(method, url, data, callbacks, options) {
            var request,
                args,
                type = _methodsToRequest[method],
                self = this,
                token = this.getOAuthToken(),
                triggerBulkRequest = false;

            options = options || {};
            callbacks = callbacks || {};

            // by default use json headers
            var params = {
                type: type,
                dataType: 'json',
                headers: {},
                timeout: options.timeout || this.timeout,
                contentType: 'application/json'
            };

            // if we dont have a url from options take arg url
            if (!options.url) {
                params.url = url;
            }

            if (callbacks.success) {
                params.success = function(data, status) {
                    request.status = (data && data.status) ? data.status : status;
                    callbacks.success(data, request);
                };
            }

            params.complete = function() {

                _requests[request.uid] = null;

                // Do not call complete callback if we are in token refresh loop
                // We'll call complete callback once the refresh completes
                if (!_refreshingToken && callbacks.complete) {
                    callbacks.complete(request);
                }
            };

            //Process the iframe transport request
            if (options.iframe === true) {
                if (token) {
                    data = data || {};
                    data['OAuth-Token'] = token;
                    params.data = data;
                }
            } else {
                // set data for create, update, and delete
                if (data && (method == 'create' || method == 'update' || method == 'delete')) {
                    if (data instanceof FormData) {
                        params.data = data;
                    } else {
                        params.data = JSON.stringify(data);
                    }
                }
            }

            // Don't process data on a non-GET request.
            if (params.type !== 'GET') {
                params.processData = false;
            }

            // Switching to bulk in case of GET URI size limit (2KB) reached, this allows to avoid server errors
            if (params.type === 'GET' && !options.bulk && _allowBulk && params.url.length > 2048) {
                options.bulk = _.uniqueId();
                triggerBulkRequest = true;
            }

            // Clients may override any of AJAX options.
            request = new HttpRequest(_.extend(params, options), this.debug);
            params.error = _handleErrorAndRefreshToken(self, request, callbacks);
            // Keep original error and complete callback for token refresh loop
            request._oerror = callbacks.error;
            request._ocomplete = callbacks.complete;

            //add request to requests hash
            request.uid = _ruid++;
            _requests[request.uid] = request;

            args = [
                token,
                options.skipMetadataHash ? null : this.getMetadataHash(),
                options.skipMetadataHash ? null : this.getUserprefHash()
            ];
            // Login request doesn't need auth token
            if (this.isLoginRequest(url)) {
                request.execute();
            } else if (this.isAuthRequest(url)) {
                request.execute(token);
            } else if (params.bulk && _allowBulk) {
                var bulkQueue = _bulkQueues[params.bulk] || [];
                if (!_bulkQueues[params.bulk]) {
                    _bulkQueues[params.bulk] = bulkQueue;
                }
                bulkQueue.push({
                    request: request,
                    args: args
                });

                if (triggerBulkRequest) {
                    this.triggerBulkCall(params.bulk);

                    return request;
                }
            } else {
                request.execute.apply(request, args);
            }

            return request;
        },

        /**
         * Begins a BulkAPI request. Previous uses of call() should have
         * options.bulk set to an ID.
         *
         * Calling triggerBulkCall with the same ID will combine all the
         * previously queued requests into a single bulk call.
         * @param {number|string} bulkId The id of the bulk request.
         * @memberOf Api
         * @instance
         */
        triggerBulkCall: function(bulkId) {
            if (!_allowBulk) {
                return;
            }

            bulkId = bulkId || true;
            var queue = _bulkQueues[bulkId],
                requests = [],
                version = _.last(this.serverUrl.split('/'));

            if (!queue) {
                //TODO log an error here
                return;
            }
            _.each(queue, function(r) {
                var params = r.request.params,
                    args = r.args,
                    token = args[0],
                    mdHash = args[1],
                    upHash = args[2];

                if (token) {
                    params.headers = params.headers || {};
                    params.headers['OAuth-Token'] = token;
                }
                if (mdHash) {
                    params.headers = params.headers || {};
                    params.headers['X-Metadata-Hash'] = mdHash;
                }
                if (upHash) {
                    params.headers = params.headers || {};
                    params.headers['X-Userpref-Hash'] = upHash;
                }
                //Url needs to be trimmed down to the version number.
                if (!_.isEmpty(params.url)) {
                    params.url = version + params.url.substring(this.serverUrl.length);
                }

                requests.push(params);
            }, this);
            this.call('create', this.buildURL('bulk'), {requests: requests}, {
                success: function(o, parentReq) {
                    _.each(queue, function(r, i) {
                        var request = r.request,
                            result = o[i],
                            contents = result.contents || {},
                            xhr = new bulkXHR(result, parentReq);
                        request.xhr = xhr;

                        if (request.aborted === true || contents.error) {
                            request.status = 'error';
                            if (_.isFunction(request.params.error)) {
                                request.params.error.call(request.params, request, 'error', xhr.statusText);
                            }
                        }
                        else {
                            if (_.isFunction(request.params.success)) {
                                request.params.success.call(request.params, contents, 'success');
                            }
                        }
                        if (_.isFunction(request.params.complete)) {
                            request.params.complete.call(request.params, request);
                        }
                    });
                }
            });
            _bulkQueues[bulkId] = null;
        },

        /**
         * Clears the bulk call queue.
         *
         * @memberOf Api
         * @instance
         */
        clearBulkQueue: function() {
            _bulkQueues = {};
        },

        /**
         * Builds URL based on module name action and attributes of the format
         * rooturl/module/id/action.
         *
         * The `attributes` hash must contain `id` of the resource being
         * actioned upon for record CRUD and `relatedId` if the URL is build for
         * relationship CRUD.
         *
         * @param {string} module module name.
         * @param {string} action CRUD method.
         * @param {Object} [attributes] object of resource being
         *   actioned upon, e.g. `{name: "bob", id:"123"}`.
         * @param {Object} [params] URL parameters.
         * @return {string} URL for specified resource.
         * @memberOf Api
         * @instance
         */
        buildURL: function(module, action, attributes, params) {
            params = params || {};
            var parts = [];
            var url;
            parts.push(this.serverUrl);

            if (module) {
                parts.push(module);
            }

            if ((action != 'create') && attributes && attributes.id) {
                parts.push(attributes.id);
            }

            if (attributes && attributes.link && action != 'file') {
                parts.push('link');
                if (_.isString(attributes.link)) {
                    parts.push(attributes.link);
                }
            }

            if (action && $.inArray(action, _baseActions) === -1) {
                parts.push(action);
            }

            if (attributes) {
                if (attributes.relatedId) {
                    parts.push(attributes.relatedId);
                }

                if (action == 'file' && attributes.field) {
                    parts.push(attributes.field);
                    if (attributes.fileId) {
                        parts.push(attributes.fileId);
                    }
                } else if (action === 'collection' && attributes.field) {
                    parts.push(attributes.field);
                }
            }

            url = parts.join('/');

            // URL parameters
            // remove nullish params
            _.each(params, function(value, key) {
                if (value === null || value === undefined) {
                    delete params[key];
                }
            });

            params = $.param(params);
            if (params.length > 0) {
                url += '?' + params;
            }

            return url;
        },

        /**
         * Builds a file resource URL.
         *
         * The `attributes` hash must contain the following properties:
         *
         *     {
         *         module: module name
         *         id: record id
         *         field: Name of the file field in the given module (optional).
         *     }
         *
         * Example 1:
         *
         *     var url = app.api.buildFileURL({
         *        module: 'Contacts',
         *        id: '123',
         *        field: 'picture'
         *     });
         *
         *     // Returns:
         *     'http://localhost:8888/sugarcrm/rest/v10/Contacts/123/file/picture?format=sugar-html-json&platform=base'
         *
         * The `field` property is optional. If omitted the method returns a
         * URL for a list of file resources.
         *
         * Example 2:
         *
         *     var url = app.api.buildFileURL({
         *        module: 'Contacts',
         *        id: '123'
         *     });
         *
         *     // Returns:
         *     'http://localhost:8888/sugarcrm/rest/v10/Contacts/123/file?platform=base'
         *
         * @param {Object} attributes Hash with file information.
         * @param {Object} [options] URL options hash.
         * @param {boolean} [options.htmlJsonFormat] Flag indicating if
         *   `sugar-html-json` format must be used (`true` by default if
         *   `field` property is specified).
         * @param {boolean} [options.passDownloadToken] Flag indicating if
         *   download token must be passed in the URL (`false` by default).
         * @param {boolean} [options.deleteIfFails] Flag indicating if
         *   related record should be marked deleted:1 if file operation
         *   unsuccessful.
         * @param {boolean} [options.keep] Flag indicating if the temporary
         *   file should be kept when issuing a `GET` request to the
         *   `FileTempApi` (it is cleaned up by default).
         * @return {string} URL for the file resource.
         * @memberOf Api
         * @instance
         */
        buildFileURL: function(attributes, options) {
            var params = {};
            options = options || {};
            // We only concerned about the format if build URL for an actual file resource
            if (attributes.field && (options.htmlJsonFormat !== false)) {
                params.format = 'sugar-html-json';
            }

            if (options.deleteIfFails === true) {
                params.delete_if_fails = true;
            }

            if (options.passDownloadToken) {
                params.download_token = this.getDownloadToken();
            }

            if (!_.isUndefined(options.forceDownload)) {
                params.force_download = (options.forceDownload) ? 1 : 0;
            }

            if (options.cleanCache === true) {
                params[(new Date()).getTime()] = 1;
            }

            if (options.platform !== undefined) {
                params.platform = options.platform;
            } else if (_platform) {
                params.platform = _platform;
            }

            if (options.keep === true) {
                params.keep = 1;
            }

            return this.buildURL(attributes.module, 'file', attributes, params);
        },

        /**
         * Returns the current access token.
         *
         * @return {string} The current access token.
         * @memberOf Api
         * @instance
         */
        getOAuthToken: function() {
            return _keyValueStore ? _keyValueStore.get('AuthAccessToken') || _accessToken : _accessToken;
        },

        /**
         * Returns the current refresh token.
         *
         * @return {string} The current refresh token.
         * @memberOf Api
         * @instance
         */
        getRefreshToken: function() {
            return _keyValueStore ? _keyValueStore.get('AuthRefreshToken') || _refreshToken : _refreshToken;
        },

        /**
         * Returns the current download token.
         *
         * @return {string} The current download token.
         * @memberOf Api
         * @instance
         */
        getDownloadToken: function() {
            return _keyValueStore ? _keyValueStore.get('DownloadToken') || _downloadToken : _downloadToken;
        },

        /**
         * Returns the current metadata hash.
         *
         * @return {string} The current metadata hash
         * @memberOf Api
         * @instance
         */
        getMetadataHash: function() {
            return _keyValueStore ? _keyValueStore.get('meta:hash') : null;
        },

        /**
         * Gets the user preference hash for use in checking state of change.
         *
         * @return {string} The user preference hash set from a /me response.
         * @memberOf Api
         * @instance
         */
        getUserprefHash: function() {
            return _keyValueStore ? _keyValueStore.get('userpref:hash') : null;
        },

        /**
         * Fetches metadata.
         *
         * @param {Objec} [options] Options to decide what to get from
         *   the server.
         * @param {Array} [options.types] Metadata types to fetch.
         *   E.g.: `['vardefs','detailviewdefs']`
         * @param {Array} [options.modules] Module names to fetch.
         *   E.g.: `['accounts','contacts']`
         * @param {Object} [options.callbacks] callback object.
         * @param {Object} [options.public=false] Pass `true` to get the
         *   public metadata.
         * @param {Object} [options.params] Extra params to send to the
         *   request.
         * @return {HttpRequest} The AJAX request.
         * @memberOf Api
         * @instance
         */
        getMetadata: function(options) {

            if (_.isString(options)) {
                console.warn('`Api::getMetadata` has changed signature ' +
                    'and will drop support for the old signature in a future release. Please update your code.');

                var oldOpt = arguments[4] || {};
                options = {
                    types: arguments[1],
                    modules: arguments[2],
                    callbacks: arguments[3],
                    public: oldOpt.getPublic,
                    params: oldOpt.params,
                };
            }

            options = options || {};
            var params = options.params || {};

            if (options.types) {
                params.type_filter = options.types.join(',');
            }

            if (options.modules) {
                params.module_filter = options.modules.join(',');
            }

            if (_platform) {
                params.platform = _platform;
            }

            var method = 'read';

            if (options.public) {
                method = 'public';
            } else {
                options.callbacks = options.callbacks || {};
                options.callbacks.success = _.wrap(options.callbacks.success, function (success, data, status) {
                    if (data) {
                        this._serverInfo = data.server_info;
                    }

                    if (success) {
                        success(data, status);
                    }
                });
            }

            params.module_dependencies = 1;

            var url = this.buildURL('metadata', method, null, params);
            return this.call(method, url, null, options.callbacks);
        },

        /**
         * Executes CRUD on records.
         *
         * @param {string} method operation type: create, read, update, or delete.
         * @param {string} module module name.
         * @param {Object} data request object. If it contains id, action,
         *   link, etc., URI will be adjusted accordingly.
         * If methods parameter is 'create' or 'update', the data object will be put in the request body payload.
         * @param {Object} [params] URL parameters.
         * @param {Object} [callbacks] callback object.
         * @param {Object} [options] request options.
         * @return {HttpRequest} The AJAX request.
         * @memberOf Api
         * @instance
         */
        records: function(method, module, data, params, callbacks, options) {
            var url = this.buildURL(module, method, data, params);
            return this.call(method, url, data, callbacks, options);
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
         * @param {string} method operation type: create, read, update, or delete.
         * @param {string} module module name.
         * @param {Object} data object with relationship information.
         * @param {Object} [params] URL parameters.
         * @param {Object} [callbacks] callback object.
         * @param {Object} [options] request options.
         * @return {HttpRequest} The AJAX request.
         * @memberOf Api
         * @instance
         */
        relationships: function(method, module, data, params, callbacks, options) {
            var url = this.buildURL(module, null, data, params);
            return this.call(method, url, data.related, callbacks, options);
        },

        /**
         * Fetch the lean count of related records.
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
         * @param {string} module module name.
         * @param {Object} data object with relationship information.
         * @param {Object} [params] URL parameters.
         * @param {Object} [callbacks] callback object.
         * @param {Object} [options] request options.
         * @return {HttpRequest} The AJAX request.
         * @memberOf Api
         * @instance
         */
        relatedLeanCount: function(module, data, params, callbacks, options) {
            var url = this.buildURL(module, 'leancount', data, params);
            return this.call('read', url, data.related, callbacks, options);
        },

        /**
         * Fetches a collection field.
         *
         * @param {string} module Module name.
         * @param {Object} data object containing information to build the url.
         * @param {string} data.field The name of the collection field to fetch.
         * @param {string} data.id The name of the bean id the collection field
         *   belongs to.
         * @param {Object} [params] URL parameters.
         * @param {Object} [callbacks] callback object.
         * @param {Object} [options] request options.
         * @return {HttpRequest} The AJAX request.
         * @memberOf Api
         * @instance
         */
        collection: function(module, data, params, callbacks, options) {
            var url = this.buildURL(module, 'collection', data, params);
            return this.call('read', url, null, callbacks, options);
        },

        /**
         * Marks/unmarks a record as favorite.
         *
         * @param {string} module Module name.
         * @param {string} id Record ID.
         * @param {boolean} favorite Flag indicating if the record must be marked as favorite.
         * @param {Object} [callbacks] Callback object.
         * @param {Object} [options] request options.
         * @return {HttpRequest} The AJAX request.
         * @memberOf Api
         * @instance
         */
        favorite: function(module, id, favorite, callbacks, options) {
            var action = favorite ? 'favorite' : 'unfavorite';
            var url = this.buildURL(module, action, { id: id });
            return this.call('update', url, null, callbacks, options);
        },

        /**
         * Subscribe/unsubscribe a record changes.
         *
         * @param {string} module Module name.
         * @param {string} id Record ID.
         * @param {boolean} followed Flag indicates if wants to subscribe
         *   the record changes.
         * @param {Object} [callbacks] Callback object.
         * @param {Object} [options] request options.
         * @return {HttpRequest} The AJAX request.
         * @memberOf Api
         * @instance
         */
        follow: function(module, id, followed, callbacks, options) {
            callbacks = callbacks || {};
            options = options || {};
            var method = followed ? 'create' : 'delete',
                action = followed ? 'subscribe' : 'unsubscribe',
                url = this.buildURL(module, action, { id: id });
            return this.call(method, url, null, callbacks, options);
        },

        /**
         * Loads an enum field's options using the enum API.
         *
         * @param {string} module Module name.
         * @param {string} field Name of enum field.
         * @param {Object} [callbacks] Callback object
         * @param {Object} [options] Options object
         * @return {HttpRequest} The AJAX request.
         * @memberOf Api
         * @instance
         */
        enumOptions: function(module, field, callbacks, options) {
            var url = this.buildURL(module + '/enum/' + field);
            return this.call('read', url, null, callbacks, options);
        },

        /**
         * Calls API requests in bulk.
         *
         * @param {Object} data Object with requests array.
         * @param {Object} callbacks
         * @param {Object} [options] Options object.
         * @return {HttpRequest} The AJAX request.
         * @memberOf Api
         * @instance
         */
        bulk: function(data, callbacks, options) {
            var url = this.buildURL('bulk');
            return this.call('create', url, data, callbacks, options);
        },

        /**
         * Given a url, attempts to download a file.
         *
         * @param {string} url url to call
         * @param {Object} [callbacks] Callback object
         * @param {Object} [options] Options object
         *  - iframe: jquery element upon which to attach the iframe for download
         *    if not specified we must fall back to window.location.href
         * @memberOf Api
         * @instance
         */
        fileDownload: function(url, callbacks, options) {
            callbacks = callbacks || {};
            options = options || {};
            var internalCallbacks = {};

            internalCallbacks.success = function(data) {
                // start the download with the "iframe" hack
                if (options.iframe) {
                    options.iframe.prepend('<iframe class="hide" src="' + url + '"></iframe>');
                } else {
                    window.location.href = url;
                }
                if (_.isFunction(callbacks.success)) {
                    callbacks.success.apply(arguments);
                }
            };

            if (_.isFunction(callbacks.error)) {
                internalCallbacks.error = callbacks.error;
            }

            if (_.isFunction(callbacks.complete)) {
                internalCallbacks.complete = callbacks.complete;
            }

            // ping to make sure we have our token, then make an iframe and download away
            return this.call('read', this.buildURL('ping'), {}, internalCallbacks, {processData: false});
        },

        /**
         * This function uses native XMLHttpRequest to download File/Blob data from an endpoint.
         * jQuery ajax struggles with Blob data, so this adds a Sugar-friendly way to do it.
         *
         * @param {String} url The URL to use for the XMLHttpRequest
         * @param {Function} [callback] An optional callback function to call at the end of onload
         */
        xhrDownloadFile: function(url, callback) {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', url, true);
            xhr.responseType = 'arraybuffer';

            xhr.onload = function() {
                var fileName = '';
                var disposition;
                var fileNameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
                var matches;
                var contentType;
                var blob;
                var URL;
                var downloadUrl;
                var aEl;

                if (this.status === 200) {
                    disposition = xhr.getResponseHeader('Content-Disposition');
                    contentType = xhr.getResponseHeader('Content-Type');

                    if (disposition && disposition.indexOf('attachment') !== -1) {
                        matches = fileNameRegex.exec(disposition);

                        if (matches != null && matches[1]) {
                            fileName = matches[1].replace(/['"]/g, '');
                        }
                    }

                    if (typeof File === 'function') {
                        blob = new File([this.response], fileName, {
                            type: contentType
                        });
                    } else {
                        blob = new Blob([this.response], {
                            type: contentType
                        });
                    }

                    if (typeof window.navigator.msSaveBlob !== 'undefined') {
                        // this lets us work around IE's HTML7007 blob issue
                        window.navigator.msSaveBlob(blob, fileName);
                    } else {
                        URL = window.URL || window.webkitURL;
                        downloadUrl = URL.createObjectURL(blob);

                        if (fileName) {
                            // set up an anchor Element to take advantage of the download attribute
                            aEl = document.createElement('a');
                            aEl.download = fileName;
                            aEl.target = '_blank';
                            aEl.href = downloadUrl;
                            // appends the anchor element to the dom
                            document.body.appendChild(aEl);
                            // clicks the actual anchor link to begin download process
                            aEl.click();
                        } else {
                            window.location = downloadUrl;
                        }

                        // perform cleanup of removing the anchor element from the DOM
                        // as well as revoking the ObjectURL to prevent minor memory leak
                        setTimeout(function () {
                            URL.revokeObjectURL(downloadUrl);
                        }, 100);
                    }

                    if (_.isFunction(callback)) {
                        callback(fileName);
                    }
                }
            };

            xhr.setRequestHeader('OAuth-Token', this.getOAuthToken());
            xhr.setRequestHeader('Content-type', 'application/json');
            xhr.send();
        },

        /**
         * Executes CRUD on a file resource.
         *
         * @param {string} method operation type: create, read, update, or delete.
         * @param {Object} data object with file information.
         * <pre>
         * {
         *   module: module name
         *   id: model id
         *   field: Name of the file-type field.
         * }
         * </pre>
         * The `field` property is optional. If not specified, the API fetches the file list.
         * @param {Object} [$files] jQuery/Zepto DOM elements that carry the files to upload.
         * @param {Object} [callbacks] callback object.
         * @param {Object} [options] Request options hash.
         * See {@link Api#buildFileURL} function for other options.
         * @return {HttpRequest} The AJAX request.
         * @memberOf Api
         * @instance
         */
        file: function(method, data, $files, callbacks, options) {
            let ajaxParams = {
                processData: false,
                contentType: false,
            };

            let fd = new FormData();

            // first we check if there was anything sent at all
            if (data.field && $files) {
                let attachedFile = $files[0];
                // then we check if we really have files to work with
                if (!_.isUndefined(attachedFile) && attachedFile.files && attachedFile.files.length) {
                    fd.append(data.field, attachedFile.files[0]);
                }
            }

            options = options || {};
            options.htmlJsonFormat = false;

            if (options.deleteIfFails !== false) {
                options.deleteIfFails = true;
            }

            callbacks.success = _.wrap(callbacks.success, function(success, data) {
                if (data.error && _.isFunction(callbacks.error)) {
                    callbacks.error(data);
                } else if (_.isFunction(success)) {
                    success(data);
                }
            });

            return this.call(method, this.buildFileURL(data, options), fd, callbacks, ajaxParams);
        },

        /**
         * Fetches the total amount of records for a given module.
         *
         * Example 1:
         *
         *     app.api.count('Contacts', null, {
         *         success: function(data) {
         *             console.log('Total number of Contacts:' +
         *                 data.record_count);
         *         }
         *     });
         *
         * Example 2:
         *
         *     app.api.count('Accounts', null,
         *         {
         *             success: function(data) {
         *                 console.log('Total number of "B" Accounts:' +
         *                     data.record_count);
         *             }
         *         },
         *         {
         *             filter: [{'name': {'$starts': 'B'}}]
         *         }
         *     );
         *
         * Example 3:
         *
         *     app.api.count('Accounts',
         *         {
         *             id: 'abcd',
         *             link: 'cases'
         *         },
         *         {
         *             success: function(data) {
         *                 console.log('Total number of "B" cases related' +
         *                     'to "abcd" account:' + data.record_count);
         *             }
         *         },
         *         {
         *             filter: [{'name': {'$starts': 'B'}}]
         *         }
         *     );
         *
         * @param {string} module Module to fetch the count for.
         * @param {Object} [data] Data object containing relationship
         *   information.
         * @param {string} [data.link] The link module name.
         * @param {string} [data.id] The id of the model.
         * @param {function} [callbacks] Callback functions.
         * @param {Object} [options] URL options hash.
         * @param {Object} [options.filter] If supplied, the count of
         *   filtered records will be returned, instead of the total number
         *   of records.
         * @return {HttpRequest} Result of {@link Api#call}.
         * @memberOf Api
         * @instance
         */
        count: function(module, data, callbacks, options) {
            options = options || {};
            var url = this.buildURL(module, 'count', data, options);

            return this.call('read', url, null, callbacks);
        },

        /**
         * Triggers a file download of the exported records.
         *
         * @param {Object} params Download parameters.
         * @param {string} params.module Module name.
         * @param {Array} params.uid Array of record ids to request export.
         * @param {jQuery} $el JQuery selector to element.
         * @param {Object} [callbacks] Various callbacks.
         * @param {Function} [callbacks.success] Called on success.
         * @param {Function} [callbacks.error] Called on failure.
         * @param {Function} [callbacks.complete] Called when finished.
         * @param {Object} [options] Request options hash.
         * @return {HttpRequest} The AJAX request.
         * @memberOf Api
         * @instance
         */
        exportRecords: function(params, $el, callbacks, options) {
            var self = this;
            var recordListUrl = this.buildURL(params.module, 'record_list');

            options = options || {};

            return this.call(
                'create',
                recordListUrl,
                {'records': params.uid},
                {
                    success: function(response) {
                        params = _.omit(params, ['uid', 'module']);
                        if (options.platform !== undefined) {
                            params.platform = options.platform;
                        } else if (_platform) {
                            params.platform = _platform;
                        }

                        self.fileDownload(
                            self.buildURL(response.module_name, 'export', {relatedId: response.id}, params),
                            callbacks,
                            { iframe: $el }
                        );
                    }
                }
            );
        },

        /**
         * Searches for specified query.
         *
         * @param {Object} params Properties.
         * @param {string} params.q Query.
         * @param {string} [params.module_list] Comma-separated module list.
         * @param {string} [params.fields] Comma-separated list of fields.
         * @param {number} [params.max_num] Max number of records to return.
         * @param {number} [params.offset] Initial offset into the results.
         * @param {Object} callbacks Hash with success and error callbacks.
         * @param {Function} callbacks.success Function called on success.
         *   Takes one argument.
         * @param {Function} callbacks.error Function called on failure.
         *   Takes one argument.
         * @param {Object} [options] Request options.
         * @return {HttpRequest} The AJAX request.
         * @memberOf Api
         * @instance
         */
        search: function(params, callbacks, options) {
            options = options || {};
            //FIXME: This is a temporary change. SC-4253 will set it back to
            //'search' once BR-2367 will be merged.
            var data = null;
            if (options.data) {
                data = options.data;
                delete options.data;
            }
            var method = 'read';
            if (options.fetchWithPost) {
                method = 'create';
            }
            var endpoint = options.useNewApi ? 'globalsearch' : 'search';
            var url = this.buildURL(null, endpoint, null, params);

            return this.call(method, url, data, callbacks, options);
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
         * @param {Object} credentials user credentials.
         * @param {Object} [data] extra data to be passed in login request
         *   such as client user agent, etc.
         * @param {Object} [callbacks] callback object.
         * @return {HttpRequest} The AJAX request.
         * @memberOf Api
         * @instance
         */
        login: function(credentials, data, callbacks) {
            var payload, success, error, method, url, self = this;

            credentials = credentials || {};
            callbacks = callbacks || {};

            success = function(data) {
                _resetAuth(data);
                if (_externalLogin) {
                    self.setRefreshingToken(false);
                    _refreshTokenSuccess(
                        function() {
                            // Repeat original requests
                            var r = _rqueue.shift();
                            while (r) {
                                r._dequeuing = true;
                                r.execute(self.getOAuthToken());
                                r = _rqueue.shift();
                            }
                        }
                    );
                }
                if (callbacks.success) callbacks.success(data);
            };

            error = function(error) {
                _resetAuth();
                if (callbacks.error) callbacks.error(error);
            };

            if (data && data.refresh) {
                payload = _.extend({
                    grant_type: 'refresh_token',
                    client_id: this.clientID,
                    client_secret: '',
                    refresh_token: this.getRefreshToken(),
                    platform: _platform ? _platform : 'base'
                }, data);
            } else {
                payload = _.extend({
                    grant_type: 'password',
                    username: credentials.username,
                    password: credentials.password,
                    client_id: this.clientID,
                    platform: _platform ? _platform : 'base',
                    client_secret: ''
                }, data);
                payload.client_info = data;
            }

            method = 'create';
            url = this.buildURL('oauth2', 'token', payload, {
                platform: _platform
            });
            return this.call(method, url, payload, {
                success: success,
                error: error,
                complete: callbacks.complete
            });
        },

        /**
         * Executes CRUD on user profile.
         *
         * @param {string} method Operation type: read or update (reserved for
         *   future use).
         * @param {Object} [data] user Profile object.
         * @param {Object} [params] URL parameters.
         * @param {Object} [callbacks] Callback object.
         * @return {HttpRequest} The AJAX request.
         * @memberOf Api
         * @instance
         */
        me: function(method, data, params, callbacks) {
            var url = this.buildURL('me', method, data, params);
            return this.call(method, url, data, callbacks);
        },

        /**
         * Makes a call to the CSS Api.
         *
         * @param {string} Platform
         * @param {Object} ThemeName
         * @param {Object} [callbacks] Callback object.
         * @return {HttpRequest} The AJAX request.
         * @memberOf Api
         * @instance
         */
        css: function(platform, themeName, callbacks) {
            var params = {
                platform: platform,
                themeName: themeName
            };
            var url = this.buildURL('css', 'read', {}, params);
            return this.call('read', url, {}, callbacks);
        },

        /**
         * Performs logout.
         *
         * @param {Object} [callbacks] Callback object.
         * @return {HttpRequest} The AJAX request.
         * @memberOf Api
         * @instance
         */
        logout: function (callbacks, options) {

            callbacks = callbacks || {};

            var payload = {
                token: this.getOAuthToken(),
                refresh_token: this.getRefreshToken(),
            };

            // Stock sidecar sends refresh token on logout
            // 6.7.x doesn't support it. See [NOMAD-2891]/[SI 72054]
            // TODO remove this once we drop support on 6.x on Nomad
            if (this._serverInfo && this._serverInfo.version.charAt(0) === '6') {
                delete payload.refresh_token;
            }

            var url = this.buildURL('oauth2', 'logout', payload);

            var originalComplete = callbacks.complete;
            callbacks.complete = function () {
                _resetAuth();
                if (originalComplete) originalComplete();
            };

            return this.call('create', url, payload, callbacks, options);
        },

        /**
         * Pings the server.
         *
         * The request doesn't send metadata hash by default.
         * Pass `false` for "skipMetadataHash" option to override this behavior.
         * @param {string} [action] Optional ping operation.
         *   Currently, Sugar REST API supports "whattimeisit" only.
         * @param {Object} [callbacks] callback object.
         * @param {Object} [options] request options.
         * @return {HttpRequest} The AJAX request.
         * @memberOf Api
         * @instance
         */
        ping: function(action, callbacks, options) {
            return this.call(
                'read',
                this.buildURL('ping', action, null, {
                    platform: _platform
                }),
                null,
                callbacks,
                _.extend({
                    skipMetadataHash: true
                }, options || {})
            );
        },

        /**
         * Performs signup.
         *
         * TODO: The signup action needs another endpoint to allow a guest to signup
         *
         * @param {Object} contactData user profile.
         * @param {Object} [data] extra data to be passed in login request
         *   such as client user agent, etc.
         * @param {Object} [callbacks] callback object.
         * @return {HttpRequest} The AJAX request.
         * @memberOf Api
         * @instance
         */
        signup: function(contactData, data, callbacks) {
            var payload = contactData;
            payload.client_info = data;

            var method = 'create';
            var url = this.buildURL('Contacts', 'register', payload, {
                platform: _platform
            });
            return this.call(method, url, payload, callbacks);
        },

        /**
         * Is request in request queue.
         *
         * @param {HttpRequest} request
         * @returns {boolean}
         */
        isRequestInQueue: function(request) {
            return _rqueue.indexOf(request) > -1;
        },

        /**
         * Verifies password.
         *
         * @param {Object} password The password to verify
         * @param {Object} [callbacks] Callback object.
         * @return {HttpRequest} The AJAX request.
         * @memberOf Api
         * @instance
         */
        verifyPassword: function(password, callbacks) {
            var payload = {
                password_to_verify: password
            };
            var method = 'create'; //POST so we don't require query params
            var url = this.buildURL('me/password', method);
            return this.call(method, url, payload, callbacks);
        },

        /**
         * Updates password.
         *
         * @param {Object} password The new password
         * @param {Object} password The new password
         * @param {Object} [callbacks] Callback object.
         * @return {HttpRequest} The AJAX request.
         * @memberOf Api
         * @instance
         */
        updatePassword: function(oldPassword, newPasword, callbacks) {
            var payload = {
                new_password: newPasword,
                old_password: oldPassword
            };
            var method = 'update';
            var url = this.buildURL('me/password', method);
            return this.call(method, url, payload, callbacks);
        },

        /**
         * Fetches server information.
         *
         * @param {Object} [callbacks] callback object.
         * @return {HttpRequest} The AJAX request.
         * @memberOf Api
         * @instance
         */
        info: function(callbacks) {
            var url = this.buildURL('ServerInfo');
            return this.call('read', url, null, callbacks);
        },

        /**
         * Checks if API instance is currently authenticated.
         *
         * @return {boolean} `true` if authenticated, `false` otherwise.
         * @memberOf Api
         * @instance
         */
        isAuthenticated: function() {
            return typeof(this.getOAuthToken()) === 'string' && this.getOAuthToken().length > 0;
        },

        /**
         * Clears authentication tokens.
         *
         * @memberOf Api
         * @instance
         */
        resetAuth: function() {
            _resetAuth();
        },

        /**
         * Checks if authentication token can and needs to be refreshed.
         *
         * @param {string} url URL of the failed request.
         * @param {string} errorCode Failure code.
         * @return {boolean} `true` if the OAuth2 access token can be refreshed, `false` otherwise.
         * @instance
         * @memberOf Api
         * @private
         */
        needRefreshAuthToken: function(url, errorCode) {
            return (!_refreshingToken) &&
                (typeof(this.getRefreshToken()) === 'string' && this.getRefreshToken().length > 0) &&
                (!this.isAuthRequest(url)) &&    // must not be auth request
                (errorCode === 'invalid_grant');    // means access token got expired or invalid
        },

        /**
         * Checks if we need to queue a request while token refresh is in
         * progress.
         *
         * @param {string} url
         * @return {boolean} `true` if we need to queue the request
         * @private
         * @memberOf Api
         * @instance
         */
        needQueue: function(url) {
            return _refreshingToken && !this.isAuthRequest(url);    // must not be auth request
        },

        /**
         * Checks if the request is authentication request.
         *
         * It could be either login (including token refresh) our logout request.
         * @param {string} url
         * @return {boolean} `true` if this is an authentication request,
         *   `false` otherwise.
         * @memberOf Api
         * @instance
         */
        isAuthRequest: function(url) {
            return new RegExp('\/oauth2\/').test(url);
        },

        /**
         * Checks if request is a login request.
         *
         * @param {string} url
         * @return {boolean} `true` if this is a login request, `false`
         *   otherwise.
         * @memberOf Api
         * @instance
         */
        isLoginRequest: function(url) {
            return new RegExp('\/oauth2\/token').test(url);
        },

        /**
         * Checks if the request is the refresh token request
         * @param {string} url url of the request to check
         * @return {boolean} `true` if the request is the refresh token request,
         *   `false` otherwise
         * @memberOf Api
         * @private
         */
        refreshingToken: function(url) {
            return _refreshingToken && this.isAuthRequest(url);    // must be auth request
        },

        /**
         * Sets a flag indicating that this API instance is in the process
         * of authentication token refresh.
         *
         * @param {boolean} flag Flag indicating if token refresh is in
         * progress (`true`).
         * @instance
         * @memberOf Api
         * @private
         */
        setRefreshingToken: function(flag) {
            _refreshingToken = flag;
        },

        /**
         * Handles login with an external provider.
         *
         * @param {HttpRequest} request The request to trigger.
         * @param {Object} error The error object with at least the
         *   `payload` property.
         * @param {Function} onError The function to call in case of Error
         *   during the login request.
         * @memberOf Api
         * @instance
         */
        handleExternalLogin: function(request, error, onError) {
            var self = this;

            if (!self.isLoginRequest(request.params.url)) {
                _rqueue.push(request);
            }
            // don't try to reauth again from here
            self.setRefreshingToken(true);

            $(window).on('message', function(event) {
                if (!event.originalEvent.origin || event.originalEvent.origin !== window.location.origin) {
                    // this is not our message, ignore it
                    return;
                }

                var authData = $.parseJSON(event.originalEvent.data);
                if (!authData.external_login) {
                    // this is not our message, ignore it
                    return;
                }

                $(window).on('message', null);
                var loginFailed = !authData || !authData.access_token;

                if (loginFailed) {
                    onError();
                }
                self.setRefreshingToken(false);
                _resetAuth(authData);
                if (loginFailed) {
                    // No success actions needed on failure. Proceed causes an infinite loop.
                    return;
                }
                _refreshTokenSuccess(
                    function() {
                        // Repeat original requests
                        var r = _rqueue.shift();
                        while (r) {
                            r.execute(self.getOAuthToken());
                            r = _rqueue.shift();
                        }
                    }
                );
            });
            if (_.isFunction(_externalLoginUICallback)) {
                _externalLoginUICallback(error.payload.url, '_blank',
                    'width=600,height=400,centerscreen=1,resizable=1');
            }
        },

        /**
         * Returns `true` when using an external login provider.
         *
         * @return {boolean} `true` when we are using an external
         *   login provider, `false` otherwise.
         * @memberOf Api
         * @instance
         */
        isExternalLogin: function() {
            return _externalLogin;
        },

        /**
         * Sets a flag indicating that external login prodecure is used.
         *
         * This means that 401 errors would contain external URL that we should use for authentication.
         * @param {Boolean} flag Flag indicating if external login is in effect
         * @memberOf Api
         * @instance
         */
        setExternalLogin: function(flag) {
            _externalLogin = flag;
        },

        /**
         * Sets a function as external login UI callback.
         *
         * @param {Function} callback
         * @memberOf Api
         * @instance
         */
        setExternalLoginUICallback: function(callback) {
            if (_.isFunction(callback)) {
                _externalLoginUICallback = callback;
            }
        },

        /**
         * Retrieve a property from the current state.
         *
         * @param {string} key
         * @return {Mixed}
         * @memberOf Api
         * @instance
         */
        getStateProperty: function(key) {
            return _state[key];
        },

        /**
         * Set a property of the current state. The current state will be attached to all
         * api request objects when they are sent. Modifications to the state after the request is sent
         * but before the request completes will not affect that requests state.
         *
         * States should be used to track conditions or parameters that should be applied to all requests made
         * regardless of their source.
         *
         * @param {string} key
         * @param {*} value
         * @memberOf Api
         * @instance
         */
        setStateProperty: function(key, value) {
            _state[key] = value;
        },

        /**
         * Removes the given key from the current state.
         *
         * @param {string} key
         * @memberOf Api
         * @instance
         */
        clearStateProperty: function(key) {
            delete _state[key];
        },

        /**
         * Clears the current API request state object.
         *
         * @memberOf Api
         * @instance
         */
        resetState: function() {
            _state = {};
        }
    };
}

/**
 * Ventana module allows you to get an instance of the {@link Api} class.
 *
 * @module @sugarcrm/ventana
 */
module.exports = {
    /**
     * Gets an instance of a {@link Api Sugar API class}.
     *
     * @param {Object} args The required arguments to instanciate the Sugar API class.
     * @return {Api} An instance of Sugar API class.
     */
    getInstance: function(args) {
        return _instance || this.createInstance(args);
    },

    /**
     * Creates a new instance of a {@link Api Sugar API class}.
     *
     * @param {Object} args The required arguments to instanciate the Sugar API class.
     * @return {Api} A new instance of Sugar API class.
     */
    createInstance: function(args) {
        _instance = new SugarApi(args);

        if (!('crosstab' in window) || !crosstab.supported) {
            return _instance;
        }

        // this event should only be triggered on master tab and if
        // crosstab library is loaded
        crosstab(function() {
            crosstab.on('auth:refresh', _.bind(function() {

                // prevents concurrent events from multiple tabs asking for a
                // refresh token
                if (this._runningRefreshToken) {
                    return;
                }
                this._runningRefreshToken = true;

                var self = this;

                this.login(null, { refresh: true }, {
                    complete: function() {
                        crosstab.broadcast('auth:refresh:complete', 'complete');
                    },
                    success: function() {
                        delete self._runningRefreshToken;
                        crosstab.broadcast('auth:refresh:complete', 'success');
                    },
                    error: function() {
                        delete self._runningRefreshToken;
                        crosstab.broadcast('auth:refresh:complete', 'error');
                    }
                });
            }, _instance));
        });

        return _instance;
    },

    /**
     * The HttpError class.
     *
     * @type {HttpError}
     */
    HttpError: HttpError,

    /**
     * The HttpRequest class.
     *
     * @type {HttpRequest}
     */
    HttpRequest: HttpRequest
};
