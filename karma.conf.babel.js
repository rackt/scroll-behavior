import path from 'path';
import webpack from 'webpack';

export default config => {
  const { env } = process;

  const isCi = env.CONTINUOUS_INTEGRATION === 'true';
  const runCoverage = env.COVERAGE === 'true' || isCi;

  const coverageLoaders = [];
  const coverageReporters = [];

  if (runCoverage) {
    coverageLoaders.push(
      { test: /\.js$/, include: path.resolve('src'), loader: 'isparta' }
    );

    coverageReporters.push('coverage');

    if (isCi) {
      coverageReporters.push('coveralls');
    }
  }

  config.set({
    frameworks: ['mocha'],

    files: ['./test/index.js'],

    preprocessors: {
      './test/index.js': ['webpack', 'sourcemap'],
    },

    webpack: {
      module: {
        loaders: [
          { test: /\.js$/, exclude: /node_modules/, loader: 'babel' },
          ...coverageLoaders,
        ],
      },
      plugins: [
        new webpack.DefinePlugin({
          'process.env.NODE_ENV': JSON.stringify('test'),
        }),
      ],
      devtool: runCoverage ?
        'inline-source-map' : 'cheap-module-inline-source-map',
    },

    webpackMiddleware: {
      noInfo: true,
    },

    reporters: ['mocha', ...coverageReporters],

    coverageReporter: {
      type: 'lcov',
      dir: 'coverage',
    },

    customLaunchers: {
      ChromeCi: {
        base: 'Chrome',
        flags: ['--no-sandbox'],
      },
    },

    browsers: env.BROWSER ? [env.BROWSER] : ['Chrome', 'Firefox'],

    singleRun: isCi,
  });
};
