/*
 * Copyright (c) 2017 SugarCRM Inc. Licensed by SugarCRM under the Apache 2.0 license.
 */

module.exports = {
    "/rest/v10/oauth2/token": {
        "POST" : {
            "status": 200,
            "response":{
                "access_token":"55000555",
                "download_token": "qwerty",
                "expires_in":3600,
                "token_type":"bearer",
                "scope":null,
                "refresh_token":"abc"
            }
        }
    },
    "/rest/v10/me": {
        "GET": {
            "status": 200,
            "response": {
                "current_user": {
                    'id': '1234',
                    'preferences': {
                        'language': 'en_us'
                    }
                }
            }
        }
    },
    "rest/v10/contact": {
        "POST" : {
            "status": 200,
            "response":{"guid":"833adad4-4b4a-4161-be71-ebd7c6dfeae5"}
            },
        "GET" : {
            "status" :200,
            "response" : { "records" : [
            {
                "id":"seed_coram",
                "name":"Clint Oram",
                "date_modified":"2012-02-08 19:18:25",
                "modified_user_id":"ggl-e922f452833a90cd114305590e085bfb",
                "first_name":"Clint",
                "last_name":"Oram",
                "full_name":"Clint Oram",
                "title":"CTO",
                "email1":"coram@example.com"
            },
            {
                "id":"seed_hdp",
                "name":"Hans Dieter P",
                "date_modified":"2012-02-08 19:18:25",
                "first_name":"Hans",
                "last_name":"Dieter P",
                "full_name":"Hans Dieter P",
                "title":"CFO",
                "phone_mobile":"+49 5361 90",
                "email1":"hdp@example.com"
            }]},
        "PUT" : {"status" : 405},
        "DELETE": {"status" : 405},
        "POST" : {"status" : 405}
        }
    },

    "rest/v10/search": {
        "GET" : {
            "status" :200,
            "response" : { "records" : [
            {
                "id":"xyz",
                "name":"John Smith",
                "date_modified":"2012-02-08 19:18:25",
                "_module": "Contacts"
            },
            {
                "id":"abc",
                "name":"Account X",
                "date_modified":"2012-02-08 21:18:25",
                "_module": "Accounts"
            }]}
        }
    },

    "rest/v10/contact/seed_coram" : {
        "GET" : {
            "status" : 200,
            "response" : {
                "id":"seed_coram",
                "name":"Clint Oram",
                "date_modified":"2012-02-08 19:18:25",
                "first_name":"Clint",
                "last_name":"Oram",
                "full_name":"Clint Oram",
                "title":"CTO",
                "email1":"coram@example.com",
                "email2":"",
                "invalid_email":"0",
                "email_opt_out":"0",
                "primary_address_street":"10050 North Wolfe Road, SW2-130",
                "primary_address_street_2":"",
                "primary_address_street_3":"",
                "primary_address_city":"Cuppertino",
                "primary_address_state":"CA",
                "primary_address_postalcode":"95014",
                "primary_address_country":"USA",
                "alt_address_street":"",
                "alt_address_street_2":"",
                "alt_address_street_3":"",
                "alt_address_city":"",
                "alt_address_state":"",
                "alt_address_postalcode":"",
                "alt_address_country":"",
                "assistant":"",
                "assistant_phone":"",
                "email_addresses_primary":"",
                "email_addresses":"",
                "picture":"http:\/\/www.sugarcrm.com\/crm\/images\/management\/Clint_Oram.jpg",
                "linkedin":"clintoram",
                "twitter":"sugarclint",
                "email_and_name1":"Clint Oram &lt;&gt;",
                "lead_source":"",
                "account_name":"",
                "account_id":"",
                "opportunity_role_fields":"",
                "opportunity_role_id":"",
                "opportunity_role":"",
                "reports_to_id":"",
                "report_to_name":"",
                "birthdate":"",
                "portal_name":"",
                "portal_active":"0",
                "portal_password":"",
                "portal_password1":"",
                "portal_app":"",
                "accounts":"",
                "reports_to_link":"",
                "opportunities":"",
                "bugs":"",
                "calls":"",
                "cases":"",
                "direct_reports":"",
                "emails":"",
                "documents":"",
                "leads":"",
                "products":"",
                "contracts":"",
                "meetings":"",
                "notes":"",
                "project":"",
                "project_resource":"",
                "quotes":"",
                "billing_quotes":"",
                "tasks":"",
                "tasks_parent":"",
                "user_sync":"",
                "campaign_id":"",
                "campaign_name":"",
                "campaigns":"",
                "campaign_contacts":"",
                "c_accept_status_fields":"",
                "m_accept_status_fields":"",
                "accept_status_id":"",
                "accept_status_name":"",
                "prospect_lists":"",
                "sync_contact":"",
                "modified_user_name":"Deepali Mittal Szczesny"
            }
        },
        "PUT" : {
            "status" : 200,
            "response" : {
                "id":"seed_coram",
                "name":"Clint Oram",
                "date_entered":"2012-02-08 19:18:25",
                "date_modified":"2012-02-08 19:18:25",
                "modified_user_id":"ggl-e922f452833a90cd114305590e085bfb",
                "modified_by_name":"Deepali Mittal Szczesny",
                "created_by":"ggl-e922f452833a90cd114305590e085bfb",
                "created_by_name":"Deepali Mittal Szczesny",
                "description":"",
                "deleted":"0",
                "created_by_link":"",
                "modified_user_link":"",
                "assigned_user_id":"ggl-e922f452833a90cd114305590e085bfb",
                "assigned_user_name":"Deepali Mittal Szczesny",
                "assigned_user_link":"",
                "team_id":"1",
                "team_set_id":"1",
                "team_count":"1",
                "team_name":"Global",
                "team_link":"",
                "team_count_link":"",
                "teams":"",
                "salutation":"",
                "first_name":"Clint",
                "last_name":"Oram",
                "full_name":"Clint Oram",
                "title":"CTO",
                "department":"",
                "do_not_call":"0",
                "phone_home":"",
                "email":"",
                "phone_mobile":"1-408-454-6900",
                "phone_work":"",
                "phone_other":"",
                "phone_fax":"",
                "email1":"coram@example.com",
                "email2":"",
                "invalid_email":"0",
                "email_opt_out":"0",
                "primary_address_street":"10050 North Wolfe Road, SW2-130",
                "primary_address_street_2":"",
                "primary_address_street_3":"",
                "primary_address_city":"Cuppertino",
                "primary_address_state":"CA",
                "primary_address_postalcode":"95014",
                "primary_address_country":"USA",
                "alt_address_street":"",
                "alt_address_street_2":"",
                "alt_address_street_3":"",
                "alt_address_city":"",
                "alt_address_state":"",
                "alt_address_postalcode":"",
                "alt_address_country":"",
                "assistant":"",
                "assistant_phone":"",
                "email_addresses_primary":"",
                "email_addresses":"",
                "picture":"http:\/\/www.sugarcrm.com\/crm\/images\/management\/Clint_Oram.jpg",
                "linkedin":"clintoram",
                "twitter":"sugarclint",
                "email_and_name1":"Clint Oram &lt;&gt;",
                "lead_source":"",
                "account_name":"",
                "account_id":"",
                "opportunity_role_fields":"",
                "opportunity_role_id":"",
                "opportunity_role":"",
                "reports_to_id":"",
                "report_to_name":"",
                "birthdate":"",
                "portal_name":"",
                "portal_active":"0",
                "portal_password":"",
                "portal_password1":"",
                "portal_app":"",
                "accounts":"",
                "reports_to_link":"",
                "opportunities":"",
                "bugs":"",
                "calls":"",
                "cases":"",
                "direct_reports":"",
                "emails":"",
                "documents":"",
                "leads":"",
                "products":"",
                "contracts":"",
                "meetings":"",
                "notes":"",
                "project":"",
                "project_resource":"",
                "quotes":"",
                "billing_quotes":"",
                "tasks":"",
                "tasks_parent":"",
                "user_sync":"",
                "campaign_id":"",
                "campaign_name":"",
                "campaigns":"",
                "campaign_contacts":"",
                "c_accept_status_fields":"",
                "m_accept_status_fields":"",
                "accept_status_id":"",
                "accept_status_name":"",
                "prospect_lists":"",
                "sync_contact":"",
                "modified_user_name":"Deepali Mittal Szczesny"
            }
        },
        "DELETE": { "status" : 200 },
        "POST" : { "status" : 405 }
    },

    "rest/v10/opportunities/1/link/contacts" : {
        "GET": {
            "status": 200,
            "response": {
                "next_offset":2,
                "records": [
                    {
                        "id": "6beade8e-ea5c-1906-203f-4f501294939e",
                        "first_name": "Darnell",
                        "last_name": "Fossett",
                        "opportunity_role": "Primary Decision Maker"
                    },
                    {
                        "id": "877df603-25c8-a601-198c-4f50124b0366",
                        "first_name": "Lee",
                        "last_name": "Fredrick",
                        "opportunity_role": "Business Evaluator"
                    },
                    {
                        "id": "8c440c9c-7357-54d2-7b43-4f5012552ba9",
                        "first_name": "Micheal",
                        "last_name": "Seman",
                        "opportunity_role": "Influencer"
                    }
                ]
            }
        },
        "POST": {
            "status": 200,
            "request": '{"first_name":"Ronald","last_name":"McDonald","opportunity_role":"Influencer"}',
            "response": {
                "record": {
                    "id": "1",
                    "name": "Cool Opportunity",
                    "amount": "1000000",
                    "date_modified": "2012-02-08 19:18:25"
                },
                "related_record": {
                    "id": "2",
                    "first_name": "Ronald",
                    "last_name": "McDonald",
                    "opportunity_role": "Influencer",
                    "date_modified": "2012-02-08 19:18:25"
                }
            }
        },
        "PUT": {
            "status": 200,
            "request": '{"opportunity_role":"Primary Decision Maker"}',
            "response": {
                "record": {
                    "id": "1",
                    "name": "Cool Opportunity",
                    "amount": "1000000",
                    "date_modified": "2012-02-08 19:18:25"
                },
                "related_record": {
                    "id": "2",
                    "first_name": "Ronald",
                    "last_name": "McDonald",
                    "opportunity_role": "Primary Decision Maker",
                    "date_modified": "2012-02-08 19:18:25"
                }
            }
        },
        "DELETE": {
            "status": 200,
            "response": {
                "record": {
                    "id": "1",
                    "name": "Cool Opportunity",
                    "amount": "1000000",
                    "date_modified": "2012-02-08 19:18:25"
                },
                "related_record": {
                    "id": "2",
                    "first_name": "Ronald",
                    "last_name": "McDonald",
                    "date_modified": "2012-02-08 19:18:25"
                }
            }
        }
    },
    "rest/v10/Contacts/1/file/picture" : {
        "POST": {
            "status": 200,
            "request": '{format:"sugar-html-json",oauth_token:"1aea9241-7c9a-250e-58a5-50ab7d487658"}',
            "response": "{&quot;picture&quot;:{&quot;content-type&quot;:&quot;image\/jpeg&quot;,&quot;content-length&quot;:21815,&quot;name&quot;:&quot;d5b9e35f-0c71-df6f-b88d-50ab80ce59da&quot;,&quot;width&quot;:320,&quot;height&quot;:311,&quot;uri&quot;:&quot;rest\/v10\/Contacts\/1030b8aa-a64c-f92d-ddf2-50aa5d1e6605\/file\/picture?format=sugar-html-json&amp;oauth_token=1aea9241-7c9a-250e-58a5-50ab7d487658&quot;}}"
        },
        "DELETE": {
            "status": 200,
            "request": '{"oauth_token":"1aea9241-7c9a-250e-58a5-50ab7d487658"}',
            "response": {
                "picture": {}
            }
        }
    },
    "rest/v10/Contacts/temp/file/picture" : {
        "POST":{
            "status":200,
            "request":'{format:"sugar-html-json",oauth_token:"1aea9241-7c9a-250e-58a5-50ab7d487658"}',
            "response":"{&quot;picture&quot;:{&quot;guid&quot;:&quot;14e24854-9813-2cbc-296c-50ab7def4b7b&quot;}}"
        }
    },
    "rest/v10/Contacts/temp/file/picture/1" : {
        "GET":{
            "status":200,
            "request":'{oauth_token:"1aea9241-7c9a-250e-58a5-50ab7d487658"}',
            "response":"image"
        }
    },
    '/rest/v10/Accounts': {
        GET: {
            status: 200,
            response: {
                next_offset: -1,
                records: [
                    {id: '5', name: 'ACME Corporation'}
                ]
            }
        }
    },
    '/rest/v10/Bugs': {
        GET: {
            status: 200,
            response: {
                next_offset: -1,
                records: [
                    {id: '7', name: "It's a trap!"}
                ]
            }
        }
    },
    '/rest/v10/Calls': {
        GET: {
            status: 200,
            response: {
                next_offset: -1,
                records: [
                    {id: '7', name: 'Talk about awesome product'}
                ]
            }
        }
    },
    responseErrors: {
        threehundred:{code: 300,body: "The value used for an external ID exists in more than one record. The response body contains the list of matching records."},
        fourhundred:{code: 400,body: 'The request could not be understood, usually because the JSON or XML body has an error.  This error code will also return all SQL errors from the server as well.'},
        fouroone:{code: 401,body: "The session ID or OAuth token used has expired or is invalid. The response body contains the message anderrorCode."},
        fourothree:{code: 403,body: "The request has been refused. Verify that the logged-in user has appropriate permissions."},
        fourofour:{code: 404,body: "The requested resource could not be found. Check the URI for errors, and verify that there are no sharing issues."},
        fourofive:{code: 405,body: "The method specified in the Request-Line is not allowed for the resource specified in the URI."},
        fourfith:{code: 415,body: "The entity specified in the request is in a format that is not supported by specified resource for the specified method."},
        fivehundered:{code: 500,body: "An error has occurred within SugarCRM, so the request could not be completed. Contact sugarcrm.com Customer Support."},
    }
};
