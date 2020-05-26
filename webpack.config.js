const path = require('path');

module.exports = {
  entry: './webbenchmark/index.js',
  devtool: 'source-map',
  mode: 'development',
  output: {
    path: path.resolve(__dirname, 'webbenchmark/build'),
    filename: 'out.js'
  },
  devServer: {
    contentBase: path.join(__dirname, 'webbenchmark'),
  },
  plugins: [
  ]
};
