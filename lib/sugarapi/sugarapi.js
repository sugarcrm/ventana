//create the SUGAR namespace if one does not exist already
var SUGAR = SUGAR || {};

//create an Api namespace
SUGAR.Api = (function () {
    var instance;

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
            baseUrl:"/rest/v10/",

            //Method to construct the ajax request
            call:function(method, url, options) {
                var settings = {};
                if (method) {
                    settings.type = method;
                }
                if (options) {
                    _.extend(settings, options);
                }
                if (settings == {}) {
                    $.ajax(url);
                }
                else {
                    $.ajax(url, settings);
                }
            }
        };
    }

    return {
        getInstance:function(args) {
            return instance || init(args);
        }
    }
})();
