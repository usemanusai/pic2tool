const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const isDevelopment = process.env.NODE_ENV !== 'production';

// Helper function to resolve paths
const resolvePath = (...paths) => path.resolve(__dirname, ...paths);

module.exports = [
  // Main process configuration
  {
    mode: isDevelopment ? 'development' : 'production',
    entry: resolvePath('src', 'main', 'main.ts'),
    target: 'electron-main',
    devtool: isDevelopment ? 'source-map' : false,
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: {
            loader: 'ts-loader',
            options: {
              transpileOnly: true,
            },
          },
          exclude: /node_modules/,
        },
      ],
    },
    resolve: {
      extensions: ['.ts', '.js'],
      alias: {
        '@': resolvePath('src'),
      },
    },
    output: {
      path: resolvePath('dist'),
      filename: 'main.js',
      clean: true,
    },
    node: {
      __dirname: false,
      __filename: false,
    },
    externals: {
      'electron': 'commonjs electron',
      'electron-log': 'commonjs electron-log',
      'electron-store': 'commonjs electron-store',
      'fluent-ffmpeg': 'commonjs fluent-ffmpeg',
      'sharp': 'commonjs sharp',
      'jimp': 'commonjs jimp',
    },
  },
  // Preload script configuration
  {
    mode: isDevelopment ? 'development' : 'production',
    entry: resolvePath('src', 'preload', 'preload.ts'),
    target: 'electron-preload',
    devtool: isDevelopment ? 'source-map' : false,
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: {
            loader: 'ts-loader',
            options: {
              transpileOnly: true,
            },
          },
          exclude: /node_modules/,
        },
      ],
    },
    resolve: {
      extensions: ['.ts', '.js'],
      alias: {
        '@': resolvePath('src'),
      },
    },
    output: {
      path: resolvePath('dist'),
      filename: 'preload.js',
    },
    node: {
      __dirname: false,
      __filename: false,
    },
    externals: {
      'electron': 'commonjs electron',
    },
  },
  // Renderer process configuration
  {
    mode: isDevelopment ? 'development' : 'production',
    entry: resolvePath('src', 'renderer', 'index.tsx'),
    target: 'electron-renderer',
    devtool: isDevelopment ? 'source-map' : false,
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: {
            loader: 'ts-loader',
            options: {
              transpileOnly: true,
            },
          },
          exclude: /node_modules/,
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader'],
        },
        {
          test: /\.(png|jpe?g|gif|svg|ico)$/,
          type: 'asset/resource',
          generator: {
            filename: 'assets/[name][ext]',
          },
        },
        {
          test: /\.(woff|woff2|eot|ttf|otf)$/,
          type: 'asset/resource',
          generator: {
            filename: 'fonts/[name][ext]',
          },
        },
      ],
    },
    resolve: {
      extensions: ['.tsx', '.ts', '.js', '.jsx'],
      alias: {
        '@': resolvePath('src'),
      },
    },
    output: {
      path: resolvePath('dist'),
      filename: 'renderer.js',
      publicPath: './',
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: resolvePath('src', 'renderer', 'index.html'),
        filename: 'index.html',
        inject: 'body',
      }),
    ],
    devServer: {
      static: {
        directory: resolvePath('dist'),
      },
      port: 3000,
      hot: true,
      historyApiFallback: true,
      compress: true,
    },
    optimization: {
      splitChunks: false, // Disable code splitting for Electron renderer to avoid chunk conflicts
    },
  },
];
