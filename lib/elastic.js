var elastic = {},
    elasticsearch = require('elasticsearch'),
    Q = require('q'),
    TEMPLATE_NAME = "template_gaceta",
    template_mapping = require("./template/template_mapping.json"),
    client = new elasticsearch.Client({
        host: 'localhost:9200'
    });

elastic.deleteTemplate = function() {
    var deferred = Q.defer();

    client.indices.existsTemplate({
      name: TEMPLATE_NAME
    }, function() {
        client.indices.deleteTemplate({
          name: TEMPLATE_NAME
        }, function(err) {
          if (err) {
              err;
          }
          deferred.resolve();
        });
    });

    return deferred.promise;
};

elastic.setTemplate = function() {
    this.deleteTemplate().then(function() {
      client.indices.putTemplate({
        create: true,
        name: TEMPLATE_NAME,
        body: template_mapping
      }, function(err) {
        if (err) {
          throw err;
        }
        console.log('Template added:', TEMPLATE_NAME);
      });
    });
};

module.exports = elastic;