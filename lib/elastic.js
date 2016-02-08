var elasticsearch = require('elasticsearch');
var templateMapping = require('./template/template_mapping.json');
var Q = require('q');
var gutil = require('gulp-util');
var chalk = require('chalk');

var client = {};
var elastic = {};
var TEMPLATE_NAME = 'template_gaceta';

client = new elasticsearch.Client({
  host: 'localhost:9200'
});

elastic.deleteTemplate = function () {
  var deferred = Q.defer();

  client.indices.existsTemplate({
    name: TEMPLATE_NAME
  }, function () {
    client.indices.deleteTemplate({
      name: TEMPLATE_NAME
    }, function (err) {
      if (err) {
        throw err;
      }

      deferred.resolve();
    });
  });

  return deferred.promise;
};

elastic.setTemplate = function () {
  this.deleteTemplate().then(function () {
    client.indices.putTemplate({
      create: true,
      name: TEMPLATE_NAME,
      body: templateMapping
    }, function (err) {
      if (err) {
        throw err;
      }
      gutil.log(chalk.green('Template added:', TEMPLATE_NAME));
    });
  });
};

module.exports = elastic;
