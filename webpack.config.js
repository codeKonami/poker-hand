const path = require('path');
const webpack = require('webpack');

module.exports = {
  entry: './src/pokerhand.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'pokerhand.min.js',
    libraryTarget: 'umd',
    library: 'PokerHand'
  },
  module: {
    rules: [
      {
        test: /\.(js)$/,
        use: 'babel-loader'
      }
    ]
  },
  plugins: [
    new webpack.optimize.UglifyJsPlugin()
  ]
}
