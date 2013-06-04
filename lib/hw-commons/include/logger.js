var commons = require('../commons')
  , util = commons.requireEnhancedUtil()
  , LOG_LEVELS, that;

LOG_LEVELS = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'];

that = {
  config: {
    verbose: true,
    colors: true,
    logLevel: 'error'
  },
  init: function (config) {
    util.copyProperties(config, that.config);
    if (that.config.colors) {
      require('colors');
    }
  },
  log: function (logLevel) {
    var argumentsArray, colors, level;
    if (!that.config.verbose) {
      return;
    }
    argumentsArray = Array.prototype.slice.apply(arguments);
    level = logLevel && logLevel.toUpperCase();
    if (LOG_LEVELS.indexOf(level) === -1) {
      level = 'INFO';
      argumentsArray.splice(0, 0, level);
    }
    if (LOG_LEVELS.indexOf(level) < LOG_LEVELS.indexOf(that.config.logLevel.toUpperCase())) {
      return;
    }
    colors = that.config.colors;
    switch (level) {
      case 'FATAL':
        level = (colors && level.magenta) || level;
        argumentsArray.splice(0, 1);
        break;
      case 'ERROR':
        level = (colors && level.red) || level;
        argumentsArray.splice(0, 1);
        break;
      case 'WARN':
        level = (colors && level.yellow) || level;
        argumentsArray.splice(0, 1);
        break;
      case 'DEBUG':
        level = (colors && level.green) || level;
        argumentsArray.splice(0, 1);
        break;
      case 'INFO':
        level = 'INFO';
        level = (colors && level.blue) || level;
        argumentsArray.splice(0, 1);
        break;
      default:
        level = 'INFO';
        level = (colors && level.blue) || level;
    }
    util.log(util.format('%s : %s', level, util.format.apply(this, argumentsArray)));
  }
};

module.exports = that;