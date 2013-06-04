var that;

that = {
  requireEnhancedUtil: function () {
    return require('./include/enhanced-util');
  },
  requireLogger: function () {
    return require('./include/logger');
  }
};

module.exports = that;