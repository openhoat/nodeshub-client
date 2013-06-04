var path = require('path')
  , fs = require('fs')
  , pkg = require('./package')
  , baseDir, appName, config;

baseDir = __dirname;
appName = 'nodeshub';

config = {
  baseDir: baseDir,
  appName: appName,
  env: process.env['NODESHUB_ENV'] || 'production',
  verbose: true,
  colors: true,
  userAgent: { name: appName, version: pkg.version },
  server: { host: 'api.nodeshub.com' },
  envs: {
    development: {
      server: { host: 'api.localdomain', port: 3000 }
    }
  }
};

config.server.port = config.server.port || 80;

module.exports = config;