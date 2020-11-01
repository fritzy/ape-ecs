const path = require("path");
const TerserPlugin = require("terser-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
  entry: "./webbenchmark/index.js",
  devtool: "source-map",
  mode: "production",
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
    path: path.resolve(__dirname, "webbenchmark/build"),
    filename: "out.js",
  },
  devServer: {
    contentBase: path.join(__dirname, "webbenchmark"),
  },
  plugins: [
    new HtmlWebpackPlugin({
      title: "APE-ECS Web Benchmark",
    }),
  ],
};
