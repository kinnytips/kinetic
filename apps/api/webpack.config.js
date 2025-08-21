const path = require('path');
const { composePlugins, withNx } = require('@nx/webpack');

module.exports = composePlugins(withNx(), (config) => {
  // silence the "mode" warning and give sane defaults
  config.mode = process.env.NODE_ENV === 'production' ? 'production' : 'development';

  // we’re bundling for Node
  config.target = 'node';

  // force the correct entry (no accidental "./src" at repo root)
  config.entry = {
    main: path.resolve(__dirname, 'src/main.ts'),
  };

  // emit exactly where serve expects
  config.output = {
    path: path.resolve(__dirname, '../../dist/apps/api'),
    filename: 'main.js',
    clean: true,
  };

  // make sure TS resolves; keep existing plus add .ts/.tsx
  config.resolve = config.resolve || {};
  config.resolve.extensions = Array.from(new Set([...(config.resolve.extensions || []), '.ts', '.tsx', '.js']));

  // if you use TS path aliases, uncomment this block:
  // const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
  // config.resolve.plugins = [...(config.resolve.plugins || []), new TsconfigPathsPlugin({
  //   configFile: path.resolve(__dirname, 'tsconfig.app.json'),
  // })];

  return config;
});
