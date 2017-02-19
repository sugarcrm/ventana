/*
 * Copyright (c) 2017 SugarCRM Inc. Licensed by SugarCRM under the Apache 2.0 license.
 */

const webpack = require('webpack');
const path = require('path');

module.exports = function (config) {

    config.set({
        basePath: '../',

        files: [
            // peerDependencies
            'node_modules/underscore/underscore.js',
            'node_modules/jquery/dist/jquery.min.js',
            'node_modules/jquery-migrate/dist/jquery-migrate.min.js',

            // FIXME remove these and load them in the tests
            'node_modules/sinon/pkg/sinon.js',
            'node_modules/jasmine-sinon/lib/jasmine-sinon.js',

            { pattern: 'test/index.js', watched: false },
        ],

        preprocessors: {
            'test/index.js': ['webpack', 'sourcemap'],
        },

        frameworks: [
            'jasmine',
        ],

        reporters: ['progress', 'coverage'],

        // web server port
        port: 9876,

        // level of logging
        // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
        logLevel: config.LOG_INFO,

        singleRun: true,

        // start these browsers
        // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
        browsers: ['Chrome'],

        webpack: {
            devtool: 'inline-source-map',
            module: {
                preLoaders: [
                    {
                        test: /\.js$/,
                        include: [
                            path.resolve('src'),
                        ],
                        loader: 'istanbul-instrumenter',
                    },
                ],
            },
            plugins: [
                new webpack.DefinePlugin({
                    ZEPTO: JSON.stringify(process.env.ZEPTO),
                }),
            ],
            resolve: {
                root: [
                    path.resolve(__dirname, '../src'),
                    path.resolve(__dirname, '../lib'),
                    path.resolve(__dirname, '../node_modules'),
                ],
                modulesDirectories: [
                    'node_modules',
                ],
                extensions: [
                    '', '.js', '.json',
                ],
            },
        },
        webpackMiddleware: {
            stats: 'errors-only',
        },
    });
};
