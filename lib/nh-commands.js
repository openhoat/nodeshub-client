var commons = require('./hw-commons/commons')
  , util = commons.requireEnhancedUtil()
  , path = require('path')
  , fs = require('fs')
  , http = require('http')
  , walker = require('fs.walker')
  , Zip = require('node-zip')
  , temp = require('temp')
  , read = require('read')
  , httpUtil = require('./nh-http-util')
  , io = require('socket.io-client')
  , Profess = require('profess')
  , WsEventMgr = require('wsem').Client()
  , config = require('../config')
  , that, userHome, nhDataFile, nhDatas;

userHome = process.env[(process.platform.indexOf('win') === 0) ? 'USERPROFILE' : 'HOME'];

nhDataFile = path.join(userHome, util.format('.%s-datas', config.appName));
if (fs.existsSync(nhDataFile)) {
  nhDatas = JSON.parse(fs.readFileSync(nhDataFile));
} else {
  nhDatas = {};
}

that = {
  colorMode: true,
  color1: function (text) {
    return that.colorMode ? text.blue : text;
  },
  color2: function (text) {
    return that.colorMode ? text.green : text;
  },
  color3: function (text) {
    return that.colorMode ? text.red : text;
  },
  out: function (text) {
    var args, s;
    args = Array.prototype.slice.apply(arguments);
    s = util.format.apply(this, args);
    util.puts(s);
  },
  outc: function (text) {
    var args, s;
    args = Array.prototype.slice.apply(arguments);
    s = util.format.apply(this, args);
    util.print(s);
  },
  err: function (text) {
    var args, s;
    args = Array.prototype.slice.apply(arguments);
    s = util.format.apply(this, args);
    util.error(s);
  },
  infoWebapp: function (webappName, callback) {
    httpUtil.doGet(config.server.host, config.server.port, util.format('/console/app/%s', webappName), that.nhDataHeaders(), function (err, webapp) {
      if (err) {
        return callback(err);
      }
      callback(null, JSON.parse(webapp));
    });
  },
  listWebapps: function (callback) {
    httpUtil.doGet(config.server.host, config.server.port, '/console/apps', that.nhDataHeaders(), function (err, webapps) {
      var webappNames;
      if (err) {
        return callback(err);
      }
      webapps = webapps ? JSON.parse(webapps) : [];
      webappNames = [];
      webapps.forEach(function (webapp) {
        webappNames.push(webapp.name);
      });
      callback(null, webappNames);
    });
  },
  login: function (username, callback) {
    read({ prompt: 'Password: ', silent: true }, function (err, password) {
      if (err) {
        return callback(err);
      }
      httpUtil.doPost(config.server.host, config.server.port, '/login', null, {
        username: username,
        password: password,
        remember: true
      }, function (err, headers, data) {
        var user;
        if (err) {
          return callback(err);
        }
        user = JSON.parse(data);
        nhDatas.username = user.username;
        nhDatas.pwdHash = user.pwdHash;
        fs.writeFileSync(nhDataFile, JSON.stringify(nhDatas));
        callback();
      });
    });
  },
  logout: function (callback) {
    delete nhDatas['username'];
    delete nhDatas['pwdHash'];
    fs.unlink(nhDataFile, callback);
  },
  account: function (callback) {
    httpUtil.doGet(config.server.host, config.server.port, util.format('/account'), that.nhDataHeaders(), function (err, data) {
      if (err) {
        return callback(err);
      }
      callback(null, JSON.parse(data));
    });
  },
  nhDataHeaders: function () {
    return {
      'Authorization': 'NodesHubLogin ' +
        JSON.stringify({ username: nhDatas.username, pwdHash: nhDatas.pwdHash })
    };
  },
  publishWebapp: function (webappDir, callback) {
    var cleanUp, errorHandler, i, webappName, zipFile, zip, zipData, cleanup, ignoreFile, ignoreRegexps, profess;
    profess = new Profess();
    cleanUp = function () {
      that.outc('Cleaning up...');
      cleanup();
      that.out('%s', that.color2('done'));
    };
    errorHandler = profess.handleError(function (err) {
      that.out('');
      cleanUp();
      callback(err);
    });
    profess.
      do(function () {
        webappDir = webappDir || process.cwd();
        webappName = path.basename(webappDir);
        ignoreFile = path.join(webappDir, '.nhignore');
        try {
          ignoreRegexps = fs.readFileSync(ignoreFile).toString().split('\n');
          for (i = 0; i < ignoreRegexps.length; i++) {
            ignoreRegexps[i] = new RegExp(ignoreRegexps[i]);
          }
        } catch (err) {
          ignoreRegexps = [];
        }
        profess.next();
      }).
      then(function () {
        var walkAndDo, fileCounter, noFiles;
        that.out('Creating zip file from %s', webappName);
        zipFile = temp.path({ prefix: util.format('%s-%s-', config.appName, webappName), suffix: '.zip' });
        cleanup = function () {
          fs.unlinkSync(zipFile);
        };
        zip = new Zip();
        walkAndDo = function (doFunction) {
          walker.walkSync().
            set({relative: webappDir}).
            on('file',function (filePath, context) {
              var i, relFilePath, re;
              if (filePath === zipFile) {
                return;
              }
              relFilePath = path.relative(context.base, context.path);
              if (relFilePath.indexOf('node_modules/') === 0) {
                return;
              }
              if (relFilePath.indexOf('.git/') === 0) {
                return;
              }
              if (relFilePath === '.nhignore') {
                return;
              }
              for (i = 0; i < ignoreRegexps.length; i++) {
                if (relFilePath.match(ignoreRegexps[i])) {
                  return;
                }
              }
              doFunction(filePath, relFilePath);
            }).
            walk([webappDir]);
        };
        fileCounter = 0;
        walkAndDo(function () {
          fileCounter++;
        });
        noFiles = fileCounter;
        fileCounter = 0;
        walkAndDo(function (filePath, relFilePath) {
          that.outc('\rProcessing file %s/%s...', that.color2('' + (++fileCounter)), noFiles);
          zip.file(relFilePath, util.toArrayBuffer(fs.readFileSync(filePath)));
        });
        that.out('%s', that.color2('done'));
        profess.next();
      }).
      then(function () {
        that.outc('Building zip file %s...', zipFile);
        zipData = zip.generate({ base64: false, compression: 'DEFLATE' });
        fs.writeFileSync(zipFile, zipData, 'binary');
        that.out('%s', that.color2('done'));
        profess.next();
      }).
      /*
      then(function () {
        that.outc('Removing existing webapp %s from nodeshub...', webappName);
        that.removeWebapp(webappName, errorHandler);
      }).
      */
      then(function () {
        that.out('%s', that.color2('done'));
        that.outc('Uploading zip to nodeshub server...');
        httpUtil.doUpload(config.server.host,
          config.server.port,
          util.format('/console/app/%s', webappName),
          that.nhDataHeaders(),
          zipFile,
          errorHandler);
      }).
      then(function () {
        that.out('%s', that.color2('done'));
        profess.next();
      }).
      then(cleanUp);
  },
  installWebapp: function (webappName, callback) {
    httpUtil.doPost(config.server.host,
      config.server.port,
      util.format('/console/app/%s?install', webappName),
      that.nhDataHeaders(),
      null,
      callback,
      function (data) {
        that.outc(data);
      }
    );
  },
  removeWebapp: function (webappName, callback) {
    httpUtil.doDelete(config.server.host,
      config.server.port,
      util.format('/console/app/%s', webappName),
      that.nhDataHeaders(),
      callback);
  },
  startWebapp: function (webappName, callback) {
    httpUtil.doPost(config.server.host,
      config.server.port, util.format('/console/app/%s?start', webappName),
      that.nhDataHeaders(),
      null,
      callback);
  },
  statusWebapp: function (webappName, callback) {
    httpUtil.doGet(config.server.host,
      config.server.port,
      util.format('/console/app/%s', webappName),
      that.nhDataHeaders(),
      function (err, webapp) {
        if (err) {
          return callback(err);
        }
        callback(null, JSON.parse(webapp).running);
      });
  },
  stopWebapp: function (webappName, callback) {
    httpUtil.doPost(config.server.host,
      config.server.port,
      util.format('/console/app/%s?stop', webappName),
      that.nhDataHeaders(),
      null,
      callback);
  },
  logWebapp: function (webappName, callback) {
    httpUtil.doGet(config.server.host,
      config.server.port,
      util.format('/console/logs/%s', webappName),
      that.nhDataHeaders(),
      function (err, data) {
        var logs, socket, wsem;
        if (err) {
          return callback(err);
        }
        logs = JSON.parse(data);
        util.error(logs.stderr);
        util.puts(logs.stdout);
        socket = io.connect(config.server.host + ':' + config.server.port, { 'force new connection': true });
        socket.on('connect', function () {
          wsem = new WsEventMgr(socket);
          wsem.on('stderr/' + nhDatas.username + '/' + webappName, function (data) {
            util.error(data);
          });
          wsem.on('stdout/' + nhDatas.username + '/' + webappName, function (data) {
            util.puts(data);
          });
          socket.on('disconnect', function () {
            callback();
          });
        });
      });
  }
};

module.exports = that;