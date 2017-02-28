/*
 * Copyright (c) 2017 SugarCRM Inc. Licensed by SugarCRM under the Apache 2.0 license.
 */

exports.jssource = {
   "modules": {
        "Home": {
            '_hash': '12345678910',
            "fields": {},
            "views": {
                "base": {
                    "login": {
                        "controller": "{customCallback : function(){return \"base called\";}}"
                    }
                },
                "portal": {
                    "login": {
                        "controller": "{customCallback : function(){return \"overriden portal\";}}"
                    }
                }
            }
        },
        "Contacts": {
            '_hash': '98765678910',
            "fields": {},
            "views": {},
            "layouts": {
                "base": {
                    "detailplus": {
                        "controller": "{customLayoutCallback : function(){return \"base called\";}}"
                    }
                },
                "portal": {
                    "foo": {
                        "controller": "{customCallback : function(){return \"overriden portal\";}}"
                    }
                }
            }
        }
    },
    'layouts': {
        "base": {
            "fluid": {
                controller: "({})"
            }
        }
    },
    'views' : {
        "base" : {
            "plugintestview" : {
                "controller" : "({plugins:['foo']})"
            },
            "sugarlogictestview" : {
                "controller" : "({plugins:['SugarLogic']})"
            }
        }
    },
    'fields': {
        "base": {
            "base": {
                controller: "{" +
                    "render : function(){" +
                    "app.view.Field.prototype.render.call(this);" +
                    "}," +
                    "customCallback : function(){}" +
                    "}"
            },
            "enum": {
                controller: "{" +
                    "fieldTag:\"select\",\n" +
                    "render:function(){" +
                    "   var result = app.view.Field.prototype.render.call(this);" +
                    "   $(this.fieldTag + \"[name=\" + this.name + \"]\").chosen();" +
                    "   $('select').chosen();" +
                    "   return result;" +
                    "}" +
                    "" +
                    "\n}\n"
            }
        }
    }
};
exports.metadata = {
    _hash: '2q34aasdfwrasdfse',
    "server_info": {
        "flavor":"ENT",
        "version":"6.6.0",
        "fts": {
            "enabled":false
        },
        "server_time":"2012-11-30T23:25:49+00:00",
        "gmt_time":"2012-11-30T23:25:49+0000"
    },
    "labels": {
        _hash: "abcxyz",
        "default": "en_us",
        en_us: "../fixtures/labels.json"
    },
    "hidden_subpanels": {
        0: "contacts",
        1: "bugs"
    },
    "config":{
      "configfoo":"configBar"
    },
    "relationships": {
        "contacts_accounts": {
            lhs_module:"Accounts",
            rhs_module:"Contacts"
        }
    },
    "currencies": {
        "-99": {
            id: '-99',
            symbol: "$",
            conversion_rate: "1.0",
            iso4217: "USD"
        },
        "abc123": {
            id: 'abc123',
            symbol: "€",
            conversion_rate: "0.9",
            iso4217: "EUR"
        }
    },
    "modules": {
        "Cases": {
            '_hash': '12345678910',
            "fields": {
                "id": {
                    "name": "id",
                    "type": "id"
                },
                "case_number": {
                    "name": "case_number",
                    "type": "float",
                    round: 2,
                    precision: 2,
                    number_group_seperator: ",",
                    decimal_seperator: "."
                },
                name: {
                    audited: true,
                    comment: "The short description of the bug",
                    dbType: "varchar",
                    full_text_search: {boost: 3},
                    len: 255,
                    link: true,
                    merge_filter: "selected",
                    name: "name",
                    type: "name",
                    unified_search: true,
                    vname: "LBL_SUBJECT"
                },
                "description": {
                    "name": "description",
                    "type": "base"
                },
                "type": {
                    "name": "type",
                    "type": "varchar"
                },
                "status": {
                    "name": "status",
                    "type": "enum",
                    "options": "case_status_dom"
                },
                "priority": {
                    "name": "priority",
                    "type": "enum",
                    "multi": true,
                    "options": "case_priority_dom"
                },
                "date_entered": {
                    "name": "date_entered",
                    "type": "datetimecombo"
                },
                "created_by": {
                    "name": "created_by",
                    "type": "varchar"
                },
                "date_modified": {
                    "name": "date_modified",
                    "type": "datetimecombo"
                },
                "modified_user_id": {
                    "name": "modified_user_id",
                    "type": "varchar"
                },
                "leradio_c": {
                    "name": "leradio_c",
                    "type": "radioenum",
                    "options": "Elastic_boost_options"
                }
            },
            "views": {
                "edit": {
                    "meta": {
                        "buttons": [
                            {
                                name: "save_button",
                                type: "button",
                                label: "Save",
                                css_class: "btn-primary",
                                value: "save",
                                primary: true,
                                events: {
                                    click: "function(){ var self = this; " +
                                        "this.model.save(null, {success:" +
                                        "function(){self.app.navigate(self.context, self.model, 'detail');}" +
                                        "});" +
                                        "}"
                                }
                            },
                            {
                                name: "cancel_button",
                                type: "button",
                                label: "Cancel",
                                value: "cancel",
                                route: {
                                    action: "detail",
                                    module: "Cases"
                                },
                                primary: false
                            }
                        ],
                        "panels": [
                            {
                                "label": "Details",
                                "fields": [
                                    {name: "case_number", label: "Case Number", "class": "foo"},
                                    {name: "name", label: "Name"},
                                    {name: "status", label: "Status"},

                                    {name: "priority", label: "Priority"},
                                    {name: "description", label: "Description"},
                                    {name: "date_modified", label: "Modifed Date"},
                                    {name: "leradio_c", label: "LeRadio"}
                                ]
                            }
                        ]
                    }
                },
                "detail": {
                    "meta": {
                        "buttons": [
                            {
                                name: "edit_button",
                                type: "button",
                                label: "Edit",
                                value: "edit",
                                route: {
                                    action: "edit"
                                },
                                primary: true
                            }
                        ],
                        "panels": [
                            {
                                "label": "Details",
                                "fields": [
                                    {name: "case_number", label: "Case Number", "class": "foo"},
                                    {name: "name", label: "Name"},
                                    {name: "status", label: "Status"},

                                    {name: "priority", label: "Priority"},
                                    {name: "description", label: "Description"},
                                    {name: "date_modified", label: "Modifed Date"},
                                    {name: "leradio_c", label: "LeRadio"}
                                ]
                            }
                        ]
                    }
                },
                "quickCreate": {

                },
                //This is stored in a listviewdefs variable on the server, but its inconsistent with the rest of the app
                "list": {
                    "meta": {
                        "buttons": [
                            {
                                name: "show_more_button",
                                type: "button",
                                label: "Show More",
                                css_class: "loading wide",
                                events: {
                                    click: "function(){ var self = this; " +
                                        "this.context.attributes.collection.paginate({add:true, success:function(){window.scrollTo(0,document.body.scrollHeight);}});" +
                                        "}"
                                }
                            }
                        ],
                        "listNav": [
                            {
                                name: "show_more_button_back",
                                type: "navElement",
                                icon: "icon-plus",
                                label: " ",
                                route: {
                                    action: "create",
                                    module: "Cases"
                                }
                            },
                            {
                                name: "show_more_button_back",
                                type: "navElement",
                                icon: "icon-chevron-left",
                                label: " ",
                                events: {
                                    click: "function(){ var self = this; " +
                                        "this.context.attributes.collection.paginate({page:-1, success:function(){}});" +
                                        "}"
                                }
                            },
                            {
                                name: "show_more_button_forward",
                                type: "navElement",
                                icon: "icon-chevron-right",
                                label: " ",
                                events: {
                                    click: "function(){ var self = this; " +
                                        "this.context.attributes.collection.paginate({success:function(){}});" +
                                        "}"
                                }
                            }
                        ],
                        "panels": [
                            {
                                "label": "LBL_PANEL_1",
                                "fields": [
                                    {name: "case_number", label: "Case Number", "class": "foo"},
                                    {name: "name", label: "Name"},
                                    {name: "status", label: "Status"},
                                    {name: "priority", label: "priority"},
                                    {name: "date_modified", label: "Modifed Date"},

                                    {type: "sugarField_actionsLink", label: "Actions"}
                                ]
                            }
                        ]
                    }
                },
                //Subpanel layout defs
                "subpanel": {

                }
            },
            //Layouts map an action to a layout that defines a set of views and how to display them
            //Different clients will get different layouts for the same actions
            "layouts": {
                "edit": {
                    "meta": {
                        //Default layout is a single view
                        "type": "simple",
                        "components": [
                            {view: "edit"}
                        ]
                    }
                },
                "detail": {
                    "meta": {
                        "components": [
                            {view: "detail"},
                            {view: "subpanel"}
                        ]
                    }
                },
                "list": {
                    "meta": {
                        //Default layout is a single view
                        "type": "simple",
                        "components": [
                            {view: "list"}
                        ]
                    }
                },
                //Example of a sublayout. Two columns on the top and one view below that
                "sublayout": {
                    "meta": {
                        "type": "rows",
                        "components": [
                            {"layout": {
                                "type": "columns",
                                "components": [
                                    {view: "edit"},
                                    {view: "detail"}
                                ]
                            }},
                            {"view": "subpanel"}
                        ]
                    }
                },
                //Layout with context switch. Edit view with related detail view
                "complexlayout": {
                    "meta": {
                        "type": "columns",
                        "components": [
                            {"view": "edit"},
                            {
                                "view": "detail",
                                //Name of link to pull the new context from, In this case a single account
                                "context": "accounts"
                            }
                        ]
                    }
                },
                //Layout that references another layout
                "detailplus": {
                    "meta": {
                        "components": [
                            {view: "subpanel",
                                size: 2},
                            {layout: "edit",
                                size: 6},
                            {layout: "detail",
                                size: 3}
                        ]
                    }
                }
            },
            "fieldTemplates": {
                "enum": {
                    "templates": {
                        "detail": "Cases Enum Detail: {{value}}",
                        "edit": "<select name=\"{{name}}\" {{#if multi}} multiple {{/if}}>{{#eachOptions options}}<option value=\"{{{this.key}}}\" {{#has this.key ../value}}selected{{/has}}>{{this.value}}</option>{{/eachOptions}}</select>",
                        "default": "{{value}}\n"
                    }
                }
            }
        },
        "Contacts": {
            '_hash': '12345678910',
            "fields": {
                "id": {
                    "name": "id",
                    "type": "id"
                },
                "first_name": {
                    "name": "first_name",
                    "type": "varchar",
                    "len": 20
                },
                "last_name": {
                    "name": "last_name",
                    "type": "varchar"
                },
                "phone_work": {
                    "name": "phone_work",
                    "type": "varchar",
                    'label': 'LBL_TEST_PHONE_WORK'
                },
                "phone_home": {
                    "name": "phone_home",
                    "type": "varchar",
                    "vname": "LBL_PHONE_HOME"
                },
                "email1": {
                    "name": "email1",
                    "type": "varchar"
                },
                "salutation":{
                    "name": "salutation",
                    "type": "enum",
                    "options": "salutations_dom"
                },
                "full_name": {
                    "name": "full_name",
                    "type": "varchar",
                    "concat": ["first_name", "last_name"]
                },
                "address_street": {
                    "name": "address_street",
                    "group":"address",
                    "type": "varchar"
                },
                "address_state": {
                    "name":"address_state",
                    "group":"address",
                    "type": "varchar"
                },
                accounts: {
                    name: "accounts",
                    type: "link",
                    relationship: "contacts_accounts"
                },
                account_name: {
                    name: "account_name",
                    id_name: "account_id",
                    type: "relate",
                    module: "Accounts",
                    vname: "LBL_ACCOUNT_NAME"
                },
                account_id: {
                    name: "account_id",
                    id_name: "account_id",
                    type: "relate",
                    module: "Accounts",
                    vname: "LBL_ACCOUNT_ID"
                },
                date_modified: {
                    name: "date_modified",
                    type: "datetime"
                },
                "parent_id": {
                    group: "parent_name",
                    name: "parent_id",
                    type: "id"
                },
                "parent_name": {
                    id_name: "parent_id",
                    name: "parent_name",
                    type: "parent",
                    type_name: "parent_type"
                },
                "parent_type": {
                    name: "parent_type",
                    type: "parent_type"
                },
                modified_by_name: {
                    name: "modified_by_name",
                    type: "varchar"
                }

            },
            "views": {
                "edit": {
                    "meta": {
                        "buttons": [
                            {
                                name: "save_button",
                                type: "button",
                                label: "Save",
                                value: "save",
                                primary: true
                            },
                            {
                                name: "cancel_button",
                                type: "button",
                                label: "Cancel",
                                value: "cancel",
                                route: {
                                    action: "detail",
                                    module: "Contacts"
                                },
                                events: {
                                    //click : "app.myExtension.callback",
                                    //drag: "",
                                    foo: 'function(e){console.log(this)}'
                                },
                                primary: false
                            }
                        ],
                        "panels": [
                            {
                                "label": "Details",
                                "fields": [
                                    {name: "first_name", label: "First Name", "class": "foo"},
                                    {name: "last_name", label: "Last Name"},
                                    {
                                        name: "phone_home",
                                        displayParams: {
                                            required: true
                                        }
                                    },
                                    {name: "email1", label: "Email"},
                                    {
                                        name: "test_nested_field",
                                        fields: [
                                            {
                                                name: "subfield 1",
                                                label: "LBL_SUBFIELD"
                                            },
                                            {
                                                name: "subfield 2",
                                                label: "LBL_SUBFIELD2"
                                            }
                                        ]
                                    }
                                ]
                            }
                        ]
                    }
                },
                "detail": {
                    "meta": {
                        "buttons": [
                            {
                                name: "edit_button",
                                type: "button",
                                label: "Edit",
                                value: "edit",
                                route: {
                                    action: "edit"
                                },
                                primary: true
                            }
                        ],
                        "panels": [
                            {
                                "label": "Details",
                                "fields": [
                                    {name: "first_name", label: "First Name"},
                                    {name: "last_name", label: "Last Name"},
                                    {name: "phone_work", label: "Phone"},
                                    "phone_home",
                                    {name: "email1", label: "Email"},
                                    {name: "myButton", label: "My button", type: "button"},
                                    {name: "foo", label: "Field that doesn't exist in vardefs", type: "xyz"},
                                    {name: "account_name" },
                                    {name: "parent_name", label: "Related to"},
                                    {name: "date_modified",
                                        format: [
                                            '%0 %1 %2',
                                            'date_modified',
                                            {
                                                label: 'LBL_BY'
                                            },
                                            'modified_by_name'
                                        ],
                                        type: "combine",
                                        related_fields: [
                                            'modified_by_name'
                                        ]
                                    }
                                ]
                            }
                        ]
                    }
                },
                "quickCreate": {
                    "templates" : []
                },
                //This is stored in a listviewdefs variable on the server, but its inconsistent with the rest of the app
                "list": {
                    "meta": {
                        "panels": [
                            {
                                "label": "LBL_PANEL_1",
                                "fields": [
                                    {name: "first_name", label: "First Name"},
                                    {name: "last_name", label: "Last Name"},
                                    {name: "email1", label: "Email"},
                                    {name: "phone_work", label: "Phone"}
                                ]
                            }
                        ]
                    }
                },
                //Subpanel layout defs
                "subpanel": {
                }
            },
            //Layouts map an action to a lyout that defines a set of views and how to display them
            //Different clients will get different layouts for the same actions
            "layouts": {
                "edit": {
                    "meta": {
                        //Default layout is a single view
                        "type": "simple",
                        "components": [
                            {view: "edit"}
                        ]
                    }
                },
                "detail": {
                    "meta": {
                        "components": [
                            {view: "detail"},
                            {view: "subpanel"}
                        ]
                    }
                },
                "list": {
                    "meta": {
                        //Default layout is a single view
                        "type": "simple",
                        "components": [
                            {view: "list"}
                        ]
                    }
                },
                //Example of a sublayout. Two columns on the top and one view below that
                "sublayout": {
                    "meta": {
                        "type": "rows",
                        "components": [
                            {"layout": {
                                "type": "columns",
                                "components": [
                                    {view: "edit"},
                                    {view: "detail"}
                                ]
                            }},
                            {"view": "subpanel"}
                        ]
                    }
                },
                //Layout with context switch. Edit view with related detail view
                "complexlayout": {
                    "meta": {
                        "type": "columns",
                        "components": [
                            {"view": "edit"},
                            {
                                "view": "detail",
                                //Name of link to pull the new context from, In this case a single account
                                "context": "accounts"
                            }
                        ]
                    }
                },
                //Layout that references another layout
                "detailplus": {
                    "meta": {
                        "components": [
                            {view: "subpanel",
                                size: 2},
                            {layout: "edit",
                                size: 6},
                            {layout: "detail",
                                size: 3}
                        ]
                    }
                }
            }
        },
        "Accounts": {
            fields: {},
            filters: {
                operators: {
                    meta: {
                        enum: {
                            $in: 'is any of',
                            $not_in: 'is not any of',
                            $empty: 'is empty',
                            $not_empty: 'is not empty'
                        }
                    }
                }
            }
        },
        "Home": {
            '_hash': '12345678910',
            "fields": {
                "username": {
                    "name": "username",
                    "type": "varchar"
                },
                "password": {
                    "name": "password",
                    "type": "password"
                }
            },
            "views": {
                "login": {
                    "meta": {
                        "buttons": [
                            {
                                name: "login_button",
                                type: "button",
                                label: "Login",
                                value: "login",
                                primary: true,
                                events: {
                                    click: "function(){ var self = this; " +
                                        " var args={password:this.model.get(\"password\"), username:this.model.get(\"username\")}; app.api.login(args, {success:" +
                                        "function(){console.log(\"logged in successfully dtam!\");}" +
                                        "});" +
                                        "}"
                                }
                            }
                        ],
                        "panels": [
                            {
                                "label": "Login",
                                "fields": [
                                    {name: "username", label: "Username"},
                                    {name: "password", label: "Password"}
                                ]
                            }
                        ]
                    }
                }
            },
            //Layouts map an action to a lyout that defines a set of views and how to display them
            //Different clients will get different layouts for the same actions
            "layouts": {
                "meta": {
                    "login": {
                        //Default layout is a single view
                        "type": "simple",
                        "components": [
                            {view: "login"}
                        ]
                    }
                }
            }
        }
    },
    'fields': {
        "_hash": "x1",
        "base": {
            "templates": {
                "detail": "<h3>{{label}}<\/h3><span name=\"{{name}}\">{{value}}</span>",
                "edit": "<div class=\"controls\"><label class=\"control-label\" for=\"input01\">{{label}}<\/label> " +
                    "<input type=\"text\" class=\"input-xlarge\" value=\"{{value}}\">  <p class=\"help-block\">" +
                    "<\/p> <\/div>",
                "login": "<div class=\"controls\"><label class=\"control-label\" for=\"input01\">{{label}}<\/label> " +
                    "<input type=\"text\" class=\"input-xlarge\" value=\"{{value}}\">  <p class=\"help-block\">" +
                    "<\/p> <\/div>"
            },
            "events": {},
            controller: "{" +
                "render : function(){" +
                "app.view.Field.prototype.render.call(this);" +
                "}," +
                "customCallback : function(){}" +
                "}"
        },
        "float": {
            "templates": {
                "detail": "<h3>{{label}}<\/h3><span name=\"{{name}}\">{{value}}</span>\n",
                "edit": "<div class=\"controls\"><label class=\"control-label\" for=\"input01\">{{label}}<\/label> " +
                    "<input type=\"text\" class=\"input-xlarge\" value=\"{{value}}\">  <p class=\"help-block\">" +
                    "<\/p> <\/div>"
            },
            controller: "{" +
                "unformat:function(value){\n" +
                "  value = app.utils.unformatNumberString(value, this.def.number_group_seperator, this.def.decimal_seperator, false);\n" +
                "return value\n" +
                "}," +
                "format:function(value){\n" +
                " value = app.utils.formatNumber(value, this.def.round, this.def.precision, this.def.number_group_seperator, this.def.decimal_seperator);\n" +
                "return value\n" +
                "}" +
                "}"
        },
        "datetime": {
            "templates": {
                "detail": "<h3>{{label}}<\/h3><span name=\"{{name}}\">{{value}}</span>\n",
                "edit": "<div class=\"controls\"><label class=\"control-label\" for=\"input01\">{{label}}<\/label> " +
                    "<input type=\"text\" class=\"input-xlarge datepicker\" value=\"{{value}}\">  <p class=\"help-block\">" +
                    "<\/p> <\/div>"
            },
            controller: "{" +
                "render:function(value){\n" +
                " app.view.Field.prototype.render.call(this);//call proto render\n" +
                "  	$(function() {" +
                "$( \".datepicker\" ).datepicker({" +
                "showOn: \"button\"," +
                "buttonImage: \"../lib/jquery-ui/css/smoothness/images/calendar.gif\"," +
                "buttonImageOnly: true," +
                "dateFormat: \"yy-mm-dd\"" +
                "});" +
                "});\n" +
                "}," +
                "unformat:function(value){\n" +
                "return value\n" +
                "}," +
                "format:function(value){\n" +
                "return value\n" +
                "},\n" +
                "}"
        },
        "datetimecombo": {
            "templates": {
                "detail": "<h3>{{label}}<\/h3><span name=\"{{name}}\">{{value.dateTime}}</span>\n",
                "edit": "<div class=\"controls\"><label class=\"control-label\" for=\"input01\">{{label}}<\/label> " +
                    "<input type=\"text\" class=\"input-xlarge datepicker\" value=\"{{value.date}}\"> " +
                    "<select class=\"date_time_hours\">{{#each timeOptions.hours}}<option value=\"{{this.value}}\" {{#has this.key ..\/value.hours}}selected{{/has}}>{{this.key}}</option>{{/each}}</select>" +
                    " : " +
                    "<select class=\"date_time_minutes\">{{#each timeOptions.minutes}}<option value=\"{{this.value}}\"{{#has this.key ..\/value.minutes}}selected{{/has}}>{{this.key}}</option>{{/each}}</select>" +
                    " " +
                    "{{#if this.amPm}}<select class=\"date_time_ampm\">{{#each timeOptions.amPm}}<option value=\"{{this.value}}\" {{#has this.key ..\/value.amPm}}selected{{/has}}>{{this.key}}</option>{{/each}}</select>{{/if}}" +
                    " <p class=\"help-block\">" +
                    "<\/p> <\/div>"
            },
            controller: "{" +
                "render:function(value){\n" +
                " app.view.Field.prototype.render.call(this);//call proto render\n" +
                "  	$(function() {" +
                "$( \".datepicker\" ).datepicker({" +
                "showOn: \"button\"," +
                "buttonImage: \"../lib/jquery-ui/css/smoothness/images/calendar.gif\"," +
                "buttonImageOnly: true" +
                "});" +
                "});\n" +
                "}," +
                "unformat:function(value){\n" +
                "return value\n" +
                "}," +
                "format:function(value){\n" +
                "var jsDate = app.date.parse(value);\n" +
                "jsDate = app.date.roundTime(jsDate);\n" +
                "value = {\n" +
                "dateTime: value,\n" +
                "//TODO Account for user prefs\n" +
                "date: app.date.format(jsDate, 'Y-m-d'),\n" +
                "time: app.date.format(jsDate, 'h:i:s'),\n" +
                "hours: app.date.format(jsDate, 'H'),\n" +
                "minutes: app.date.format(jsDate, 'i'),\n" +
                "seconds: app.date.format(jsDate, 's'),\n" +
                "amPm: app.date.format(jsDate, 'H') < 12 ? 'am' : 'pm',\n" +
                "};\n" +
                "return value\n" +
                "},\n" +
                "timeOptions:{" +
                "    hours:[{key:\"00\",value:\"00\"},{key:\"01\",value:\"01\"},{key:\"02\",value:\"02\"},{key:\"03\",value:\"03\"},{key:\"04\",value:\"04\"}," +
                "        {key:\"05\",value:\"05\"},{key:\"06\",value:\"06\"},{key:\"07\",value:\"07\"},{key:\"08\",value:\"08\"},{key:\"09\",value:\"09\"}," +
                "        {key:\"10\",value:\"10\"},{key:\"11\",value:\"11\"},{key:\"12\",value:\"12\"},{key:\"13\",value:\"13\"},{key:\"14\",value:\"14\"}," +
                "        {key:\"15\",value:\"15\"},{key:\"16\",value:\"16\"},{key:\"17\",value:\"17\"},{key:\"18\",value:\"18\"},{key:\"19\",value:\"19\"}," +
                "        {key:\"20\",value:\"20\"},{key:\"21\",value:\"21\"},{key:\"22\",value:\"22\"},{key:\"23\",value:\"23\"}" +
                "            ]," +
                "    minutes:[{key:\"00\",value:\"00\"},{key:\"15\",value:\"15\"},{key:\"30\",value:\"30\"},{key:\"45\",value:\"45\"}]," +
                "    amPm:[{key:\"am\",value:\"am\"}, {key:\"pm\",value:\"pm\"}]" +
                "}," +
                "bindDomChange: function () {\n" +
                "var self = this\n" +
                "var model = this.model;\n" +
                "var fieldName = this.name;\n" +
                "var date = this.$el.find('input');\n" +

                "var hour = this.$el.find('.date_time_hours');\n" +
                "var minute = this.$el.find('.date_time_minutes');\n" +
                "date.on('change', function(ev) {\n" +
                "model.set(fieldName, self.unformat(date.val() + ' ' + hour.val() +':'+ minute.val()+':00'));\n" +
                "});\n" +
                " hour.on('change', function(ev) {\n" +
                "model.set(fieldName, self.unformat(date.val() + ' ' + hour.val() +':'+ minute.val()+':00'));\n" +
                "});\n" +
                "minute.on('change', function(ev) {\n" +
                "model.set(fieldName, self.unformat(date.val() + ' ' + hour.val() +':'+ minute.val()+':00'));\n" +
                "});\n" +
                "}\n" +
                "}"
        },
        "integer": {
            "templates": {
                "detail": "<h3>{{label}}<\/h3><span name=\"{{name}}\">{{value}}</span>\n",
                "edit": "<div class=\"controls\"><label class=\"control-label\" for=\"input01\">{{label}}<\/label> " +
                    "<input type=\"text\" class=\"input-xlarge\" value=\"{{value}}\">  <p class=\"help-block\">" +
                    "<\/p> <\/div>",
                "default": "<span name=\"{{name}}\">{{value}}</span>"
            },
            controller: "{" +
                "unformat:function(value){\n" +
                " value = app.utils.formatNumber(value, 1, 0, \"\", \".\");\n" +
                "return value\n" +
                "}," +
                "format:function(value){\n" +
                " value = app.utils.formatNumber(value, 1, 0, this.def.number_group_seperator, \".\");\n" +
                "return value\n" +
                "}" +
                "}"
        },
        "enum": {
            "templates": {
                "detail": "<h3>{{label}}<\/h3><span name=\"{{name}}\">{{value}}</span>\n",
                "edit": "<div class=\"controls\"><label class=\"control-label\" for=\"input01\">{{label}}<\/label> " +
                    "<select name=\"{{name}}\" {{#if multi}} multiple {{/if}}>{{#eachOptions options}}<option value=\"{{{this.key}}}\" {{#has this.key ../value}}selected{{/has}}>{{this.value}}</option>{{/eachOptions}}</select>  <p class=\"help-block\">" +
                    "<\/p> <\/div>",
                "default": "<span name=\"{{name}}\">{{value}}</span>"
            }
        },
        radioenum: {
            templates: {
                detail: "<h3>{{label}}</h3><span name=\"{{name}}\">{{value}}</span>\n",
                edit: "<div class=\"controls\"><label class=\"control-label\">{{label}}<\/label>" +
                    "{{#eachOptions options}}<label><input type=\"radio\" name=\"{{../name}}\" value=\"{{this}}\" {{#eq this ../value}}checked{{/eq}}>{{this}}</label>{{/eachOptions}}"
            }
        },
        "checkbox": {
            "templates": {
                "detail": "<h3>{{label}}<\/h3><span name=\"{{name}}\"><input type=\"checkbox\" class=\"checkbox\"{{#if value}} checked{{/if}} disabled></span>\n",
                "edit": "<div class=\"controls\"><label class=\"control-label\" for=\"input01\">{{label}}<\/label> " +
                    "<input type=\"checkbox\" class=\"checkbox\"{{#if value}} checked{{/if}}> <p class=\"help-block\">" +
                    "<\/p> <\/div>"
            },
            controller: "{\n" +
                "unformat:function(value){\n" +
                "  value = this.el.children[0].children[1].checked ? \"1\" : \"0\";\n" +
                "  return value\n" +
                "},\n" +
                "format:function(value){\n" +
                "  value = (value==\"1\") ? true : false;\n" +
                "  return value\n" +
                "}\n" +
                "}"
        },
        "addresscombo": {
            "templates": {
                "default": "<span>Address Combo!</span>"
            }
        },
        "address": {
            "templates": {
                "detail": "<h3>{{label}}<\/h3>" +
                    "{{value.street}}<br>" +
                    "{{value.city}}<br>" +
                    "{{value.postalcode}}<br>" +
                    "{{value.state}}<br>" +
                    "{{value.country}}<br>" +
                    "{{#if gmap}}{{#if value.city}}{{#if value.street}}" +
                    "<iframe width=\"{{def.gmap_width}}\" height=\"{{def.gmap_height}}\" frameborder=\"0\" scrolling=\"no\" marginheight=\"0\" marginwidth=\"0\" src=\"http://maps.google.com/maps?f=q&q={{value.street}} {{value.city}} {{value.postalcode}} {{value.state}} {{value.country}}&output=embed\"></iframe>" +
                    "{{/if}}{{/if}}{{/if}}",
                "edit": "<h3>{{label}}<\/h3>" +
                    "<input type=\"text\" class=\"input-xlarge address_street\" value=\"{{value.street}}\"><br>" +
                    "<input type=\"text\" class=\"input-xlarge address_city\" value=\"{{value.city}}\"><br>" +
                    "<input type=\"text\" class=\"input-xlarge address_postalcode\" value=\"{{value.postalcode}}\"><br>" +
                    "<input type=\"text\" class=\"input-xlarge address_state\" value=\"{{value.state}}\"><br>" +
                    "<input type=\"text\" class=\"input-xlarge address_country\" value=\"{{value.country}}\"><br>"
            },
            controller: "{" +
                "format:function(value, fieldName){\n" +
                "value = {\n" +
                "street: this.model.get(this.name),\n" +
                "city: this.model.get(this.formatFieldName('city')),\n" +
                "postalcode: this.model.get(this.formatFieldName('postalcode')),\n" +
                "state: this.model.get(this.formatFieldName('state')),\n" +
                "country: this.model.get(this.formatFieldName('country'))\n" +
                "};\n" +
                "return value;\n" +
                "},\n" +
                "bindDomChange: function () {\n" +
                "var self = this;\n" +
                "var model = this.model;\n" +
                "var fieldName = this.name;\n" +
                "var street = this.$el.find('.address_street');\n" +
                "var city = this.$el.find('.address_city');\n" +
                "var country = this.$el.find('.address_country');\n" +
                "var postalcode = this.$el.find('.address_postalcode');\n" +
                "var state = this.$el.find('.address_state');\n" +
                "street.on('change', function(ev) {\n" +
                "model.set(fieldName, self.unformat(street.val()));\n" +
                "});\n" +
                "city.on('change', function(ev) {\n" +
                "model.set(self.formatFieldName('city'), self.unformat(city.val()));\n" +
                "});\n" +
                "postalcode.on('change', function(ev) {\n" +
                "model.set(self.formatFieldName('postalcode'), self.unformat(postalcode.val()));\n" +
                "});\n" +
                "state.on('change', function(ev) {\n" +
                "model.set(self.formatFieldName('state'), self.unformat(state.val()));\n" +
                "});\n" +
                "country.on('change', function(ev) {\n" +
                "model.set(self.formatFieldName('country'), self.unformat(country.val()));\n" +
                "});\n" +
                "},\n" +
                "formatFieldName:function(attribute){\n" +
                "var endFieldName = '';\n" +
                "var arrFieldName = this.name.split('_');\n" +
                "if (arrFieldName[arrFieldName.length-1]=='c') { endFieldName='_c'; arrFieldName.pop(); }\n" +
                "if (arrFieldName[arrFieldName.length-1]=='street') arrFieldName.pop();\n" +
                "var rootFieldName = arrFieldName.join('_');\n" +
                "return rootFieldName + \"_\" + attribute + endFieldName;\n" +
                "}\n" +
                "}"
        },
        "password": {
            "templates": {
                "edit": "\n    <div class=\"control-group\">\n        <label class=\"control-label\" for=\"input02\">{{label}}<\/label>\n\n" +
                    "        <div class=\"controls\">\n            <input type=\"password\" class=\"input-xlarge\" id=\"\" value=\"{{value}}\">\n\n" +
                    "            <p class=\"help-block\">{{help}}<\/p>\n        <\/div>\n    <\/div>",
                "login": "\n    <div class=\"control-group\">\n        <label class=\"control-label\" for=\"input02\">{{label}}<\/label>\n\n" +
                    "        <div class=\"controls\">\n            <input type=\"password\" class=\"input-xlarge\" id=\"\" value=\"{{value}}\">\n\n" +
                    "            <p class=\"help-block\">{{help}}<\/p>\n        <\/div>\n    <\/div>"
            }
        },
        "button": {
            "templates": {
                "default": "<a href=\"{{#if def.route}}#{{buildRoute context=context model=model action=def.route.action}}" +
                    "{{else}}javascript:void(0);{{/if}}\" class=\"btn {{css_class}} {{#if def.primary}}btn-primary{{/if}}\">" +
                    "{{#if def.icon}}<i class=\"{{def.icon}}\"><\/i>{{/if}}{{label}}<\/a>\n"
            }
        },
        "navElement": {
            "templates": {
                "default": "<a href=\"{{#if def.route}}#{{buildRoute context=context model=model action=def.route.action}}" +
                    "{{else}}javascript:void(0);{{/if}}\" class=\"{{css_class}}\">" +
                    "{{#if def.icon}}<i class=\"{{def.icon}}\"><\/i>{{/if}}{{label}}<\/a>\n"
            }
        },
        "iframe": {
            "templates": {
                "detail": "<h3>{{label}}<\/h3>{{#if value}}<iframe src=\"{{value}}\" height=\"{{def.height}}\" width=\"{{def.width}}\"</iframe>{{/if}}\n",
                "edit": "<div class=\"controls\"><label class=\"control-label\" for=\"input01\">{{label}}<\/label> " +
                    "<input type=\"text\" class=\"input-xlarge\" value=\"{{#if value}}{{value}}{{else}}http://{{/if}}\">  <p class=\"help-block\">" +
                    "<\/p> <\/div>"
            },
            controller: "{" +
                "unformat:function(value){\n" +
                "  value = (value!='' && value!='http://') ? value : \"\";\n" +
                "return value\n" +
                "}" +
                "}"
        },
        "phone": {
            "templates": {
                "detail": "<h3>{{label}}<\/h3><span name=\"{{name}}\">{{value}}</span>\n",
                "edit": "<div class=\"controls\"><label class=\"control-label\" for=\"input01\">{{label}}<\/label> " +
                    "<input type=\"tel\" class=\"input-xlarge\" value=\"{{value}}\">  <p class=\"help-block\">" +
                    "<\/p> <\/div>",
                "default": "<span name=\"{{name}}\">{{value}}</span>"
            }
        },
        "textarea": {
            "templates": {
                "detail": "<label class=\"control-label\">{{label}}<\/label>{{value}}\n",
                "edit": "<label class=\"control-label\">{{label}}<\/label><textarea class=\"input-xlarge\" id=\"textarea\" rows=\"3\">{{value}}</textarea>"
            }
        },
        "sugarField_actionsLink": {
            "templates": {
                "default": "<div class=\"btn-group pull-right\"><a class=\"btn\" href=\"#\" data-toggle=\"dropdown\">Actions<span class=\"caret\"><\/span><\/a>" +
                    "<ul class=\"dropdown-menu\"> <li><a href=\"#{{model.module}}\/{{{fieldValue model \"id\"}}}\"><i class=\"icon-list-alt\"><\/i>Details<\/a><\/li> " +
                    "  <li><a href=\"#{{model.module}}\/{{{fieldValue model \"id\"}}}\/edit\"><i class=\"icon-pencil\"><\/i> Edit<\/a><\/li>  " +
                    " <li><a href=\"#{{model.module}}\/{{{fieldValue model \"id\"}}}\/delete\"><i class=\"icon-trash\"><\/i> Delete<\/a><\/li> <\/ul>     <\/div>"
            }
        }
    },
    'views': {
        "_hash": "x2",
        "detail": {
            "templates": {
                "detail": "<h3 class=\"view_title\"><a href='#{{context.attributes.module}}'>{{context.attributes.module}}</a> {{name}}</h3>" +
                    "<form name='{{name}}' class='well'>" +
                    "{{#each meta.buttons}}" +
                    "{{field ../this model=../model}}" +
                    "{{/each}}" +
                    "{{#each meta.panels}}" +
                    '<div class="{{../name}} panel">' +
                    "<h4>{{label}}</h4>" +
                    "{{#each fields}}" +
                    "<div>{{field ../../this model=../../model}}</div>" +
                    "{{/each}}" +
                    "</div>" +
                    "{{/each}}</form>"
            }
        },
        "edit": {
            "templates": {
                "edit": "<h3 class=\"view_title\"><a href='#{{context.attributes.module}}'>{{context.attributes.module}}</a> {{name}}</h3>" +
                    "<form name='{{name}}' class='well'>" +
                    "{{#each meta.buttons}}" +
                    "{{field ../this model=../model}}" +
                    "{{/each}}" +
                    "{{#each meta.panels}}" +
                    '<div class="{{../name}} panel">' +
                    "<h4>{{label}}</h4>" +
                    "{{#each fields}}" +
                    "<div>{{field ../../this model=../../model}}</div>" +
                    "{{/each}}" +
                    "</div>" +
                    "{{/each}}</form>"
            }
        },
        "list": {
            "meta": {
                "panels": [
                    {
                        "label": "LBL_PANEL_1",
                        "fields": [
                            {name: "first_name", label: "First Name"},
                            {name: "last_name", label: "Last Name"},
                            {name: "email1", label: "Email"},
                            {name: "phone_work", label: "Phone"}
                        ]
                    }
                ]
            },
            "templates": {
                "list": '<div class="span12 container-fluid subhead">' +
                    '<h3>{{context.attributes.module}}</h3>' +
                    "{{#each meta.panels}}" +
                    '<div class="{{../name}}">' +
                    '<table class="table table-striped"><thead><tr>' +
                    '{{#each fields}}' +
                    '<th width="{{def.width}}%">{{label}}</th>' +
                    '{{/each}}' +
                    '</tr></thead><tbody>' +
                    '{{#each ../context.attributes.collection.models}}' +
                    '<tr name="{{module}}_{{attributes.id}}">' +
                    '{{#each ../fields}}' +
                    // SugarField requires the current context, field name, and the current bean in the context
                    // since we are pulling from the collection rather than the default bean in the context
                    '<td class="dblclick">{{field ../../../this model=../this}}</td>' +
                    '{{/each}}' +
                    '</tr>' +
                    '{{/each}}' +
                    '</tbody></table>' +
                    '{{/each}}' +
                    "{{#each meta.buttons}}" +
                    "{{field ../this model=../model}}" +
                    "{{/each}}" +
                    "<ul class=\"nav nav-pills pull-right actions\">{{#each meta.listNav}}" +
                    '<li>' +
                    "{{field ../this model=../model}}" +
                    '</li>' +
                    "{{/each}}" +
                    '{{#if context.attributes.collection.page}}<li><div class=\"page_counter\"><small>Page {{context.attributes.collection.page}}</small></div></li>{{/if}}' +
                    '</ul>' +
                    "</div>"
            },
            "controller": "({setOrderBy: function() {}})"
        },
        "login": {
            "templates": {
                "login": "<h3 class=\"view_title\"><a href='#{{context.attributes.module}}'>{{context.attributes.module}}</a>&nbsp</h3>" +
                    "<form name='{{name}}' class='well'>" +
                    "{{#each meta.panels}}" +
                    '<div class="{{../name}} panel">' +
                    "<h4>{{label}}</h4>" +
                    "{{#each fields}}" +
                    "<div>{{field ../../this model=../../model}}</div>" +
                    "{{/each}}" +
                    "</div>" +
                    "{{/each}}" + "{{#each meta.buttons}}" +
                    "{{field ../this model=../model}}" +
                    "{{/each}}" + "</form>"
            }
        },
        "subpanel": {
            "templates": {
                "subpanel": ""
            }
        },
        "quickCreate" : {
            "meta" : {
                "buttons" : []
            }
        }
    },
    'module_list':[
        'Accounts',
        'Bugs',
        'Cases',
        'Contacts'
    ],
    modules_info: {
        'Accounts': {
            'display_tab': true,
            'enabled': true,
            'quick_create': true,
            'show_subpanels': true,
            'visible': false
        },
        'Bugs': {
            'display_tab': true,
            'enabled': true,
            'quick_create': true,
            'show_subpanels': true,
            'visible': true
        },
        'Cases': {
            'display_tab': true,
            'enabled': true,
            'quick_create': true,
            'show_subpanels': true,
            'visible': true
        },
        'Contacts': {
            'display_tab': true,
            'enabled': true,
            'quick_create': true,
            'show_subpanels': true,
            'visible': true
        }
    },
    'full_module_list':{
        'Accounts':'Accounts',
        'Bugs':'Bugs',
        'Cases':'Cases',
        'Contacts':'Contacts'
    },
    'layouts': {
        "list": {
            'meta': {
                "type": "simple",
                "components": [
                    {view: "list"}
                ]
            }
        }
    },
    'logo_url': 'company_logo.jpg',
    filters: {
        operators: {
            meta: {
                enum: {
                    $in: 'is any of',
                    $not_in: 'is not any of',
                },
                text: {
                    $equals: 'equals',
                    $starts: 'starts with'
                }
            }
        }
    }
};
