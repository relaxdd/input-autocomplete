const TerserPlugin = require('terser-webpack-plugin');
const path = require('path');

/**
 * @return {import('webpack-cli').WebpackConfiguration}
 */
module.exports = function (env, argv) {
  const isProduction = argv.mode === 'production';
  const isDevelopment = argv.mode === 'development';

  return {
    mode: argv.mode,
    devtool: isProduction ? 'source-map' : 'eval',
    entry: path.resolve(__dirname, 'src', 'autocomplete.ts'),
    watch: isDevelopment,
    watchOptions: {
      aggregateTimeout: 500,
      ignored: 'node_modules',
    },
    devServer: {
      static: {
        directory: path.resolve(__dirname),
      },
      watchFiles: path.resolve(__dirname, 'src'),
      port: 3000,
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'autocomplete.js',
    },
    optimization: {
      minimize: true,
      minimizer: [
        new TerserPlugin({
          test: /\.js(\?.*)?$/i,
          extractComments: false,
          terserOptions: {
            compress: isProduction,
          },
        }),
      ],
    },
    module: {
      rules: [
        {
          test: /\.ts(x)?$/,
          loader: 'ts-loader',
          exclude: /node_modules/,
        },
        {
          test: /\.js?$/,
          loader: 'babel-loader',
          exclude: /node_modules/,
          options: {
            presets: ['@babel/preset-env'],
          },
        },
      ],
    },
    resolve: {
      extensions: ['.ts'],
    },
    plugins: [],
  };
};