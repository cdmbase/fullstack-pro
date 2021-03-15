const Dotenv = require('dotenv-webpack');
const webpack = require('webpack');
var dotenv = require('dotenv-safe')

const options = {
    stack: [
        "apollo",
        "ts",
        "react",
        "webpack",
        "css"
    ],
    cache: '../../.cache',
    backendBuildDir: "dist",
    frontendBuildDir: "dist",
    dllBuildDir: "dist/.build/dll",
    ssr: false,
    backendUrl: "http://localhost:8091",
    webpackDll: true,
    reactHotLoader: true,
    useDefaultPostCss: true,
    persistGraphQL: false,
    frontendRefreshOnBackendChange: true,
    nodeDebugger: false,
    overridesConfig: "./tools/webpackAppConfig.js",
    plugins: [
        new Dotenv({
            path: process.env.ENV_FILE
        }),
        new webpack.DefinePlugin(
            // Object.assign(
            //     ...Object.entries(buildConfig).map(([k, v]) => ({
            //         [k]: typeof v !== 'string' ? v : `'${v.replace(/\\/g, '\\\\')}'`
            //     }))
            // )
        ),
    ],
    defines: {
        __DEV__: process.env.NODE_ENV === 'development',
        __GRAPHQL_URL__: '"http://localhost:8091/graphql"',
    }
}
let config = {
    target: 'electron-renderer',
    plugins: [
        new Dotenv({
            path: process.env.ENV_FILE
        }),
        new webpack.DefinePlugin(
            {
                __DEV__: process.env.NODE_ENV === 'development',
                __GRAPHQL_URL__: '"http://localhost:8091/graphql"',
                __CLIENT__: true,
                __SSR__: false,
                __PERSIST_GQL__: false,
                __FRONTEND_BUILD_DIR__: `'${options.frontendBuildDir}'`,
                __DLL_BUILD_DIR__: `'${options.dllBuildDir}'`,
                __DEBUGGING__: false,
            }
        ),
        new webpack.DefinePlugin({
            "__ENV__": JSON.stringify(dotenv.parsed)
        }),
    ],
    // defines: {
    //     __CLIENT__: true,
    // },
    externals: [
        'react',
        'react-redux',
        "react-redux",
        "react-fela",
        "react-helmet",
        "react-loadable",
        "react-redux",
        "react-resizable",
        "react-router",
        "react-router-config",
        "react-router-dom",
        "react-router-redux",
        "react-transition-group"
    ],

}

if (process.env.NODE_ENV === 'development') {
    const dotEnvPlugin = {
        plugins: [
            new Dotenv({
                path: process.env.ENV_FILE
            })
        ],
    }
    // config.builders.web.webpackConfig = merge(config.builders.web.webpackConfig, dotEnvPlugin);

}
const extraDefines = {
    __SSR__: false,
    __PERSIST_GQL__: false,
    __FRONTEND_BUILD_DIR__: `'${options.frontendBuildDir}'`,
    __DLL_BUILD_DIR__: `'${options.dllBuildDir}'`,
    __DEBUGGING__: false,
};

if (process.env.NODE_ENV !== 'production') {

    // if (!options.ssr) {
    //     console.log('Warning! exposing env variables in UI, only run in development.');
    //     var dotenv = require('dotenv-safe')
    //         .config(
    //             {
    //                 allowEmptyValues: true,
    //                 path: process.env.ENV_FILE,
    //                 example: '../../config/development/dev.env',
    //             });
    //     const envPlugin = {
    //         plugins: [
    //             new webpack.DefinePlugin({
    //                 "__ENV__": JSON.stringify(dotenv.parsed)
    //             }),
    //         ],
    //     }
    //     config.builders.web.webpackConfig = merge(config.builders.web.webpackConfig, envPlugin);
    // }
}

// config.defines = Object.assign(config.defines, extraDefines);
module.exports = config;