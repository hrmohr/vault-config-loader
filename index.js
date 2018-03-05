'use strict';

var watch = require('watch');
var readYaml = require('read-yaml');
var axios = require('axios');
var glob = require('glob');
var path = require('path');

var vaultUrl = process.env.VAULT_URL || 'http://vault:8200';
var token = process.env.VAULT_TOKEN_ID || 'token';

var axiosClient = axios.create({
    "baseURL": vaultUrl + "/v1/secret/",
    "headers": {"X-Vault-Token": token}
});

// load initial config values
try {
    console.log('Starting initial load...');
    var axiosRequests = [];
    var files = glob.sync('/config/*.yml', {"nodir": true});
    for (var i=0; i<files.length; i++) {
        var f = files[i];
            var data = readYaml.sync(f);
            if (data) {
                axiosRequests.push(axiosClient.post(getContext(f), data).then(function(response) {
                    var name = path.parse(response.request.path).name;
                    console.log('loading initial file: /config/' + name + '.yml');
                }));
            } else {
                console.error('no data: ' + f);
            }
    }
    axios.all(axiosRequests).then(axios.spread(function() {
        console.log('Initial load done.');
    }));
} catch (err) {
    console.error(err);
}

var watchOptions = {
    'filter': function(f, stat) {
        return !stat.isDirectory() && stat.isFile() && path.extname(f) === '.yml';
    }
};

// monitor config files for updates, new files and deletions
watch.createMonitor('/config', watchOptions, function(monitor) {
    monitor.on('changed', function (f) {
        try {
            var data = readYaml.sync(f);
            if (data) {
                axiosClient.post(getContext(f), data).then(function() {
                    console.log('update detected: ' + f);
                }).catch(function(err) {
                    if (err) throw err;
                });
            } else {
                console.error('no data: ' + f);
            }
        } catch (err) {
            console.error(err);
        }
    });

    monitor.on('created', function (f) {
        try {
            var data = readYaml.sync(f);
            if (data) {
                axiosClient.post(getContext(f), data).then(function() {
                    console.log('new config file detected: ' + f);
                }).catch(function(err) {
                    if (err) throw err;
                });
            } else {
                console.error('no data: ' + f);
            }
        } catch (err) {
            console.error(err);
        }
    });

    monitor.on('removed', function (f) {
        try {
            axiosClient.delete(getContext(f)).then(function() {
                console.log('config file was deleted: ' + f);
            }).catch(function(err) {
                if (err) throw err;
            });
        } catch (err) {
            console.error(err);
        }
    });
});

function getContext(f) {
    var context = path.parse(f).name;
    return context;
}