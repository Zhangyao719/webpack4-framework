const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const WebpackBar = require('webpackbar');
const OptimizeCssAssetsPlugin = require('optimize-css-assets-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const AddAssetHtmlPlugin = require('add-asset-html-webpack-plugin');
const config = require('./config');
const { getCSSLoaders } = require('./utils');

const env = process.env.NODE_ENV;

module.exports = {
    entry: path.resolve(config.PROJECT_SRC_PATH, 'main.jsx'),
    // entry: {
    //     main: path.resolve(config.PROJECT_SRC_PATH, 'main.jsx'),
    //     framework: ['react', 'react-dom', 'react-router-dom'], // 配合 splitChunks cacheGroup 使用
    // },

    resolve: {
        extensions: ['.js', '.jsx', '.scss'],
        alias: {
            '@': config.PROJECT_SRC_PATH,
        },
    },

    devtool: config[env].devtool,

    module: {
        rules: [
            {
                test: /\.(js|jsx)$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        // 启用缓存机制，在重复打包未改变过的模块时防止二次编译
                        cacheDirectory: true,
                        // presets 和 plugins 配置详见 .babelrc
                    },
                },
            },
            {
                test: /\.css$/,
                use: getCSSLoaders({
                    styleLoaderOptions: { publicPath: '../' }, // 指定 css 文件中, 引入静态资源的路径
                    sourceMap: config[env].cssSourceMap,
                }),
            },
            {
                test: /\.(sass|scss)$/,
                use: [
                    ...getCSSLoaders({
                        styleLoaderOptions: { publicPath: '../' },
                        cssLoaderOptions: { importLoaders: 2 },
                        sourceMap: config[env].cssSourceMap,
                    }),
                    {
                        loader: 'sass-loader',
                        options: { sourceMap: config[env].cssSourceMap },
                    },
                ],
            },
            {
                test: [/\.bmp$/, /\.gif$/, /\.jpe?g$/, /\.png$/],
                loader: 'url-loader',
                options: {
                    limit: 1024 * 5,
                    name: '[name].[hash:8].[ext]',
                    outputPath: 'assets/images', // 指定要放置目标文件的文件系统路径, 即 'dist' 目录下的路径
                    // esModule: false, // 禁用 es module 导入后, 只能使用 require() 来导入图片和文件
                },
            },
            {
                test: /\.(ttf|woff|woff2|eot|otf)$/,
                use: [
                    {
                        loader: 'url-loader',
                        options: {
                            limit: 1024,
                            name: '[name].[contenthash:8].[ext]',
                            outputPath: 'assets/fonts',
                        },
                    },
                ],
            },
        ],
    },

    plugins: [
        new WebpackBar({
            name: env === 'development' ? '正在启动' : '正在打包',
            color: '#fa8c16',
        }),
        new webpack.DefinePlugin({
            'process.env': require(`./config/${env}.env`),
        }),
        // https://github.com/jantimon/html-webpack-plugin#options
        // https://www.jianshu.com/p/2b872ae3362d 默认使用ejs渲染模板
        new HtmlWebpackPlugin({
            filename: 'index.html',
            template: path.resolve(config.PROJECT_PUBLIC_PATH, 'index.html'), // 使用指定的渲染模板
            inject: 'body', // 指定静态资源插入到 HTML 中的位置 (所有js资源插入到<body>的底部)
            favicon: './favicon.ico', // 基于构建目录寻找的路径
            // 也可以添加自定义的属性...
            showCDNFavicon: false,
        }),
        // 将已存在的静态资源复制到打包目录
        new CopyPlugin([
            {
                from: path.resolve(config.PROJECT_PATH, 'favicon.ico'),
                to: config.PROJECT_DIST_PATH,
            },
        ]),
        // 关联 dll 动态链接库
        new webpack.DllReferencePlugin({
            manifest: require(path.resolve(
                config.PROJECT_BUILD_PATH,
                'dll/vendor-manifest.json'
            )),
        }),
        // 在 html 中自动引入 dll 资源
        new AddAssetHtmlPlugin([
            {
                filepath: path.join(__dirname, '/dll/*.js'),
                outputPath: 'js', // 输出到 dist 目录下的 js 文件夹
                publicPath: `${config[env].assetsPublicPath}js`, // 脚本加载的资源路径
                hash: false,
                includeSourcemap: false,
            },
        ]),
    ],

    optimization: {
        splitChunks: {
            chunks: 'all',
            name: true,
            // maxInitialRequests: 4, // 最大并行请求的资源数 (首次加载时, 要求更高, 因此手动设置为更低)
            // cacheGroup 自定义的分离规则 默认有 vendors 和 default
            // 也可以添加新的规则，在里面对属性进行增加或修改。如果要禁用，则将其显示的设置为 false。
            // 当一个模块同时符合多个 cacheGroup 时, 根据 priority 确定优先级
            // cacheGroups: {
            //     framework: {
            //         // test: 匹配需要此缓存组的模块, 省略会选择所有模块
            //         // test(module) {
            //         //     console.log('🚀 ~ module:', module.resource); // module 是每一个 模块文件, resource 是其路径
            //         //     return /node_modules/.test(modules.resource);
            //         // },
            //         test: 'framework',
            //         name: 'framework',
            //         chunks: 'all',
            //     },
            // },
        },
        minimizer: [
            new OptimizeCssAssetsPlugin({
                // cssProcessor: require('cssnano'), // 压缩处理器, 默认 cssnano
                // canPrint: true, // 是否在 console 中展示 log, 默认 true
                assetNameRegExp: /\.css$/g, // 生效范围
                cssProcessorPluginOptions: {
                    preset: [
                        'default',
                        { discardComments: { removeAll: true } }, // 去除注释
                    ],
                },
            }),
        ],
    },
};
