var that;

that = {
  compileConfig: function (config) {
    if (config.envs && config.env && config.envs[config.env]) {
      that.copyProperties(config.envs[config.env], config, false, ['envs']);
      delete config.envs;
    }
  },
  copyProperties: function (src, dest, onlyExisting, exclude) {
    var key;
    if (typeof onlyExisting === 'undefined') {
      onlyExisting = typeof dest !== 'undefined';
    }
    if (typeof dest === 'undefined') {
      dest = {};
    }
    for (key in src) {
      if (exclude && exclude.indexOf(key) !== -1) {
        continue;
      }
      if (src.hasOwnProperty(key) && (!onlyExisting || dest.hasOwnProperty(key))) {
        if (typeof src[key] === 'object' && typeof dest[key] === 'object' && !(dest[key] instanceof Array) && dest[key] !== null) {
          if (src[key] === null) {
            dest[key] = src[key];
          } else {
            that.copyProperties(src[key], dest[key], onlyExisting);
          }
        } else {
          dest[key] = src[key];
        }
      }
    }
    return dest;
  },
  execCmd: function (cmd, params, options, callback, stdoutHandler, stderrHandler) {
    var childProcess = require('child_process')
      , process, out, err;
    if (typeof callback === 'undefined') {
      if (typeof options === 'undefined' && typeof params === 'function') {
        callback = params;
        params = null;
      } else if (typeof options === 'function') {
        callback = options;
        options = null;
      }
    }
    callback = that.safeCallback(callback);
    if (params && !Array.isArray(params)) {
      params = [params];
    }
    process = childProcess.spawn(cmd, params, options);
    if (stdoutHandler) {
      process.stdout.on('data', stdoutHandler);
    } else {
      process.stdout.on('data', function (data) {
        out = out || '';
        out += data;
      });
    }
    if (stderrHandler) {
      process.stderr.on('data', stderrHandler);
    } else {
      process.stderr.on('data', function (data) {
        err = err || '';
        err += data;
      });
    }
    process.on('close', function (code) {
      callback(code, out, err);
    });
  },
  extend: function (origin, add, replaceExisting) {
    var keys, i;
    if (!add || typeof add !== 'object') return origin;
    keys = Object.keys(add);
    i = keys.length;
    while (i--) {
      if (replaceExisting || typeof origin[keys[i]] === 'undefined') {
        origin[keys[i]] = add[keys[i]];
      }
    }
    return origin;
  },
  getHostnameFromRequest: function (req) {
    var hostInfos, hostname;
    hostInfos = req.headers['host'].split(':');
    hostname = hostInfos[0];
    return hostname;
  },
  hackArgs: function (o, methodName, callback) {
    var origMethod = o[methodName];
    callback = that.safeCallback(callback);
    o[methodName] = function () {
      return origMethod.apply(this, callback.apply(this, arguments) || arguments);
    };
  },
  hash: function (s, encoding) {
    var crypto = require('crypto')
      , shasum;
    shasum = crypto.createHash('sha1');
    shasum.update(s);
    return shasum.digest(encoding || 'base64');
  },
  hashMongoDbPassword: function (username, pwd) {
    var crypto = require('crypto')
      , shasum;
    shasum = crypto.createHash('md5');
    shasum.update(username + ':mongo:' + pwd);
    return shasum.digest('hex');
  },
  noop: function () {
  },
  safeCallback: function (callback) {
    return callback || that.noop;
  },
  toArrayBuffer: function (buffer) {
    var ab, view, i;
    ab = new ArrayBuffer(buffer.length);
    view = new Uint8Array(ab);
    for (i = 0; i < buffer.length; ++i) {
      view[i] = buffer[i];
    }
    return ab;
  }
};

that.extend(that, require('util'));

module.exports = that;