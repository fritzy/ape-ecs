const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const Package = require('./package.json');

module.exports = {
  entry: './src/index.js',
  devtool: 'source-map',
  mode: 'production',
  optimization: {
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          mangle: false,
        },
      }),
    ],
  },
  output: {
    path: path.resolve(__dirname, 'builds'),
    filename: `ape-ecs-v${Package.version}.js`,
    library: 'ApeECS',
    libraryTarget: 'umd',
    umdNamedDefine: true
  },
  plugins: [
  ],
};
