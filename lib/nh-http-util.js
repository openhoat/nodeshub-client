var config = require('../config')
  , util = require('util')
  , fs = require('fs')
  , http = require('http')
  , querystring = require('querystring')
  , FormData = require('form-data')
  , userAgent, authorizationHeader;

userAgent = util.format('%s/%s (%s)', config.userAgent.name, config.userAgent.version, process.platform);

cmdHttpUtil = {
  doGet: function (hostname, port, uriPath, headers, callback) {
    var options;
    options = {
      hostname: hostname,
      port: port,
      path: uriPath,
      agent: false,
      headers: {
        'User-Agent': userAgent
      }
    };
    if (headers) {
      for (var name in headers) {
        options.headers[name] = headers[name];
      }
    }
    http.
      get(options,function (res) {
        var data = '';
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
          data += chunk;
        });
        res.on('end', function () {
          if (res.statusCode !== 200) {
            return callback({status: res.statusCode, data: data});
          }
          callback(null, data);
        });
      }).
      on('error', function (err) {
        callback(err);
      });
  },
  doPost: function (hostname, port, uriPath, headers, data, callback, bodyHandler) {
    var options, req;
    options = {
      hostname: hostname,
      port: port,
      path: uriPath,
      method: 'post',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': userAgent
      }
    };
    if (headers) {
      for (var name in headers) {
        options.headers[name] = headers[name];
      }
    }
    req = http.
      request(options, function (res) {
        var data = '';
        bodyHandler = bodyHandler || function (chunk) {
          data += chunk;
        };
        res.setEncoding('utf8');
        res.on('data', bodyHandler);
        res.on('end', function () {
          if (res.statusCode !== 200) {
            return callback({status: res.statusCode, data: data});
          }
          callback(null, res.headers, data);
        });
      }
    );
    req.on('error', function (err) {
      callback(err);
    });
    if (data) {
      req.write(querystring.stringify(data));
    }
    req.end();
  },
  doUpload: function (hostname, port, uriPath, headers, filename, callback) {
    var form, options, req;
    form = new FormData();
    form.append('file', fs.createReadStream(filename));
    options = {
      hostname: hostname,
      port: port,
      path: uriPath,
      method: 'put',
      headers: form.getHeaders()
    };
    options.headers['User-Agent'] = userAgent;
    if (headers) {
      for (var name in headers) {
        options.headers[name] = headers[name];
      }
    }
    req = http.request(options, function (res) {
      var data = '';
      res.setEncoding('utf8');
      res.on('data', function (chunk) {
        data += chunk;
      });
      res.on('end', function () {
        if (res.statusCode !== 200) {
          return callback({status: res.statusCode, data: data});
        }
        callback(null, data);
      });
    });
    form.pipe(req);
    req.on('error', function (err) {
      callback(err);
    });
  },
  doDelete: function (hostname, port, uriPath, headers, callback) {
    var options = {
      hostname: hostname,
      port: port,
      path: uriPath,
      method: 'delete',
      headers: {
        'User-Agent': userAgent
      }
    };
    if (headers) {
      for (var name in headers) {
        options.headers[name] = headers[name];
      }
    }
    var req = http.request(options, function (res) {
      var data = '';
      res.on('data', function (chunk) {
        data += chunk;
      });
      res.on('end', function () {
        if (res.statusCode !== 200) {
          return callback({status: res.statusCode, data: data});
        }
        callback(null, data);
      });
    });
    req.on('error', function (err) {
      callback(err);
    });
    req.end();
  }
}
;

module.exports = cmdHttpUtil;
