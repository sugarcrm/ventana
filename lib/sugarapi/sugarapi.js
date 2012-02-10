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
            baseUrl:"rest/v10/",

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
            },
            /**
             * builds urls based
             *
             * @param  string module name
             * @param  string action
             * @param  object attributes of resource being saved eg {name: "bob", id:"123"}
             * @param  array  of objects of the format [{key:"timestamp", value: "NOW"}{key:"fields",value:"first_name"}]
             *         to be added as url params
             * @return obj of sugar fields stored by fieldname.viewtype
             */
           buildURL: function(module, action, attributes, params) {
               var baseActions = ["get","update","create","delete"];
               result = this.baseUrl;
               plist = [];

               if (module){
                   result += module +'/';
               }

               if (attributes && attributes.id) {
                   result += attributes.id +'/';
               }

               if (action && $.inArray(action, baseActions) == -1) {
                   result += action +'/';
               }

               if (params.length>0) {
                    for(pIndex in params) {
                        plist.push(params[pIndex].key +'='+params[pIndex].value);
                    }
                   plist = plist.join("&");
                   result += '?' + plist ;
               }

               return result;
           }
        };
    }

    return {
        getInstance:function(args) {
            return instance || init(args);
        }
    }
})();
