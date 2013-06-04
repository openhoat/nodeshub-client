require('colors');

var util = require('util')
  , path = require('path')
  , fs = require('fs')
  , commons = require('./hw-commons/commons')
  , util = commons.requireEnhancedUtil()
  , log = commons.requireLogger().log
  , config = require('../config')
  , nhCmd = require('./nh-commands')
  , cmdName, args, options;

function parseArgs() {
  var argParts;
  argParts = process.argv;
  cmdName = path.basename(argParts[1]);
  argParts.splice(0, 2);
  args = [];
  options = {};
  argParts.forEach(function (arg) {
    var optionParts;
    if (arg.indexOf('-') === 0) {
      optionParts = arg.split('=');
      options[optionParts[0]] = optionParts[1] || true;
    } else {
      args.push(arg);
    }
  });
}

function usage() {
  util.print(util.format('Usage : %s %s\n', nhCmd.color1(cmdName), nhCmd.color2('action [webapp]')));
  util.print(util.format('Type %s for a list of supported actions\n', nhCmd.color1(util.format('%s help', cmdName))));
  process.exit(1);
}

function checkWebappManifest(webappDir) {
  var manifest;
  webappDir = webappDir || process.cwd();
  manifest = path.join(webappDir, util.format('%s-manifest.json', config.appName));
  if (!fs.existsSync(manifest)) {
    manifest = path.join(process.cwd(), util.format('%s-manifest.js', config.appName));
  }
  if (!fs.existsSync(manifest)) {
    manifest = null;
  }
  return manifest ? true : false;
}

function getWebappName() {
  var webappName, manifest;
  webappName = args[1];
  if (!webappName) {
    if (!checkWebappManifest()) {
      return handleError(util.format('please provide a %s-manifest file', cmdName));
    }
    webappName = path.basename(process.cwd());
  }
  return webappName;
}

function handleError(err) {
  if (err.status === 404) {
    console.error(util.format('%s : %s', nhCmd.color3('Error'), 'Resource not found'));
  } else if (err.status === 400) {
    console.error(util.format('%s : %s', nhCmd.color3('Error'), 'Invalid arguments.'));
  } else if (err.status === 401) {
    console.error(util.format('%s : %s', nhCmd.color3('Error'), 'You must log in.'));
  } else if (err.code === 'ECONNREFUSED') {
    console.error(util.format('%s : %s', nhCmd.color3('Error'), 'Connection error.'));
  } else {
    util.error(util.format('%s :', nhCmd.color3('Error'), err.data || err));
  }
  process.exit(1);
}

util.compileConfig(config);

parseArgs();

action = (args[0] || '').toLowerCase();

if (options['-nc']) {
  nhCmd.colorMode = false;
}

if ('help' === action) {
  nhCmd.out('Usage : [options] %s %s', nhCmd.color1(cmdName), nhCmd.color2('action [webapp]'));
  nhCmd.out('');
  nhCmd.out('List of supported values for %s :', nhCmd.color1('action'));
  nhCmd.out('  %s          : %s', nhCmd.color1('help'), 'Show this command help');
  nhCmd.out('  %s %s    : %s', nhCmd.color1('login'), nhCmd.color2('john'), 'Log in to your account');
  nhCmd.out('  %s        : %s', nhCmd.color1('logout'), 'Log out of your account');
  nhCmd.out('  %s       : %s', nhCmd.color1('account'), 'Account informations');
  nhCmd.out('  %s       : %s', nhCmd.color1('list|ls'), 'List of your registered apps');
  nhCmd.out('  %s    %s : %s', nhCmd.color1('info'), nhCmd.color2('[app]'), 'Informations about the app');
  nhCmd.out('  %s  %s : %s', nhCmd.color1('status'), nhCmd.color2('[app]'), 'Status of the app');
  nhCmd.out('  %s %s : %s', nhCmd.color1('publish'), nhCmd.color2('[dir]'), 'Publish the app to the server');
  nhCmd.out('  %s %s : %s', nhCmd.color1('install'), nhCmd.color2('[app]'), 'Install app dependencies from the server');
  nhCmd.out('  %s  %s : %s', nhCmd.color1('remove'), nhCmd.color2('[app]'), 'Remove the app from the server');
  nhCmd.out('  %s   %s : %s', nhCmd.color1('start'), nhCmd.color2('[app]'), 'Start the app on the server');
  nhCmd.out('  %s    %s : %s', nhCmd.color1('stop'), nhCmd.color2('[app]'), 'Stop the app on the server');
  nhCmd.out('  %s %s : %s', nhCmd.color1('restart'), nhCmd.color2('[app]'), 'Stop and restart the app on the server');
  nhCmd.out('  %s     %s : %s', nhCmd.color1('log'), nhCmd.color2('[app]'), 'Show log of the app');
  nhCmd.out('');
  nhCmd.out('The %s param is not required if the current directory is the root of the app.', nhCmd.color2('[app]'));
  nhCmd.out('');
  nhCmd.out('List of supported options :');
  nhCmd.out('  %s : %s', nhCmd.color2('-nc'), 'Disable color mode display');
  nhCmd.out('');
} else if ('login' === action) {
  var username = args[1];
  if (!username) {
    return handleError('username argument is required');
  }
  nhCmd.login(username, function (err) {
    if (err) {
      return handleError(err);
    }
    nhCmd.out('successfully logged as %s', nhCmd.color2(username));
  });
} else if ('logout' === action) {
  nhCmd.logout(function (err) {
    if (err) {
      return handleError(err);
    }
    nhCmd.out('successfully logged out');
  });
} else if ('account' === action) {
  nhCmd.account(function (err, user) {
    if (err) {
      return handleError(err);
    }
    nhCmd.out('Account details :');
    nhCmd.out('\t%s : %s', nhCmd.color1('- username'), user.username);
    nhCmd.out('\t%s : %s', nhCmd.color1('- email'), user.email);
    if (user.twitter) {
      nhCmd.out('\t%s : %s', nhCmd.color1('- twitter username'), user.twitter);
    }
    if (user.data) {
      nhCmd.out('\t%s : %s', nhCmd.color1('- data'), user.data);
    }
  });
} else if ('list' === action || 'ls' === action) {
  nhCmd.listWebapps(function (err, webappNames) {
    if (err) {
      return handleError(err);
    }
    if (webappNames && webappNames.length) {
      nhCmd.out('registered webapps : %s', nhCmd.color2(webappNames.join(' ')));
    } else {
      nhCmd.out('no registered webapps');
    }
  });
} else if ('info' === action) {
  var webappName = getWebappName();
  nhCmd.infoWebapp(webappName, function (err, webapp) {
    var hosts;
    if (err) {
      return handleError(err);
    }
    nhCmd.out('webapp %s :\n  - version : %s\n  - main : %s',
      nhCmd.color1(webappName),
      nhCmd.color2(webapp.version),
      nhCmd.color2(webapp.main)
    );
    hosts = [];
    webapp.vhosts.forEach(function (vhost) {
      hosts.push(vhost.host);
    });
    nhCmd.out('  - virtual hosts : %s', nhCmd.color2(hosts.join(' ')));
  });
} else if ('status' === action) {
  var webappName = getWebappName();
  nhCmd.statusWebapp(webappName, function (err, running) {
    if (err) {
      return handleError(err);
    }
    nhCmd.out('webapp %s status : %s', nhCmd.color1(webappName), nhCmd.color2(running ? 'running' : 'stopped'));
  });
} else if ('install' === action) {
  var webappName = getWebappName();
  nhCmd.installWebapp(webappName, function (err) {
    if (err) {
      return handleError(err);
    }
    nhCmd.out(nhCmd.color2('done'));
  });
} else if ('start' === action) {
  var webappName = getWebappName();
  nhCmd.startWebapp(webappName, function (err) {
    if (err) {
      return handleError(err);
    }
    nhCmd.out(nhCmd.color2('done'));
  });
} else if ('stop' === action) {
  var webappName = getWebappName();
  nhCmd.stopWebapp(webappName, function (err) {
    if (err) {
      return handleError(err);
    }
    nhCmd.out(nhCmd.color2('done'));
  });
} else if ('restart' === action) {
  var webappName = getWebappName();
  nhCmd.stopWebapp(webappName, function (err) {
    if (err) {
      return handleError(err);
    }
    nhCmd.startWebapp(webappName, function (err) {
      if (err) {
        return handleError(err);
      }
      nhCmd.out(nhCmd.color2('done'));
    });
  });
} else if ('publish' === action) {
  var webappDir;
  webappDir = args[1] || process.cwd();
  if (!checkWebappManifest(webappDir)) {
    return handleError(util.format('please provide a %s-manifest file', cmdName));
  }
  nhCmd.publishWebapp(webappDir, function (err, data) {
    if (err) {
      return handleError(err);
    }
    nhCmd.out(nhCmd.color2('done'));
  });
} else if ('remove' === action) {
  var webappName = getWebappName();
  nhCmd.removeWebapp(webappName, function (err) {
    if (err) {
      return handleError(err);
    }
    nhCmd.out(nhCmd.color2('done'));
  });
} else if ('log' === action) {
  var webappName = getWebappName();
  nhCmd.logWebapp(webappName, function (err) {
    if (err) {
      return handleError(err);
    }
    nhCmd.out(nhCmd.color2('done'));
  });
} else {
  usage();
}