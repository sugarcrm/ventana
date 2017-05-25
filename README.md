# Ventana [![Build Status](https://travis-ci.org/sugarcrm/ventana.svg?branch=master)](https://travis-ci.org/sugarcrm/ventana) [![Coverage Status](https://coveralls.io/repos/github/sugarcrm/ventana/badge.svg?branch=master)](https://coveralls.io/github/sugarcrm/ventana?branch=master) [![Sauce Test Status](https://saucelabs.com/buildstatus/hackers-sugarcrm)](https://saucelabs.com/u/hackers-sugarcrm)

Ventana is a client to help connecting and making requests to a SugarCRM REST
API on multiple versions.

Currently this library provides a JavaScript connector.

Alternatively, a PHP connector is available [here](https://github.com/sugarcrm/rest-php-client).

Please contribute to help us grow this client connector.

[![Sauce Test Status](https://saucelabs.com/browser-matrix/hackers-sugarcrm.svg)](https://saucelabs.com/u/hackers-sugarcrm)

### Usage example
You just need to require the module and create an instance of the [Api](https://sugarcrm.github.io/ventana/Api.html) class:

```js
    const Ventana = require('@sugarcrm/ventana');
    const SugarApi = Ventana.getInstance({
        serverUrl: app.config.serverUrl,
        platform: app.config.platform,
        timeout: app.config.serverTimeout,
        clientID: app.config.clientID,
    });

    // Fetch the app metadata
    SugarApi.getMetadata();

    // Fetch `Accounts` records
    SugarApi.records('read', 'Accounts');

    // Favorite a specific contact
    SugarApi.favorite('Contacts', <recordId>, true);
```

**You can find the full documentation [here](https://sugarcrm.github.io/ventana/).**

## Contributing

See [Contributing guidelines](CONTRIBUTING.md).
