var elasticsearch = require('elasticsearch');
var mysql = require('mysql');
var Q = require('q');

var indexer = {};
var DOC_TYPES = {};
var connection = {};
var client = {};

var LEGISLACION_TABLE = 'legislations';
var JURISPRUDENCIA_TABLE = 'jurisprudencias';
var INDEX_DOCUMENT = 'documento';
var INDEX_INTERVAL = 100;
var FIELD_TITULO_NORMA = 'titulo_norma';
var FIELD_CONTENT = 'content';
var FIELD_ID = 'id';
var INDEX_FIELDS = [FIELD_ID, FIELD_TITULO_NORMA, FIELD_CONTENT];
var DOCUMENT_TABLES = [LEGISLACION_TABLE, JURISPRUDENCIA_TABLE];

DOC_TYPES[LEGISLACION_TABLE] = 'legislacion';
DOC_TYPES[JURISPRUDENCIA_TABLE] = 'jurisprudencia';

connection = mysql.createConnection({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  port: process.env.DB_PORT || 3306,
  dateStrings: true
});

connection.connect();

client = new elasticsearch.Client({
  host: 'localhost:9200'
});

indexer.indexRows = function (rows, docType) {
  var deferred = Q.defer();
  var data = [];

  rows.map(function (item) {
    var content = item.content.trim();
    var title = item.titulo_norma.trim();
    var id = item.id;
    var docData = {};
    var docAction = {};

    docData = {
      title: title,
      content: content,
      suggest: {
        input: title.split(' '),
        output: title,
        payload: {
          type: docType,
          id: id
        }
      }
    };

    docAction = {
      index: {
        _index: INDEX_DOCUMENT,
        _type: docType,
        _id: id
      }
    };

    data.push(docAction);
    data.push(docData);
  });

  client.bulk({
    body: data
  }, function (err) {
    if (err) {
      throw err;
    }
    deferred.resolve();
  });

  return deferred.promise;
};


function temp(from, total, tableName) {
  var deferred = Q.defer();

  indexer.indexRowsRange(from, tableName)
    .then(function () {
      var newFrom;
      if (from + INDEX_INTERVAL >= total) {
        deferred.resolve();
      } else {
        newFrom = from + INDEX_INTERVAL;
        temp(newFrom, total, tableName);
      }
    });

  return deferred.promise;
}

function tempReindex(from, total, tableName) {
  var deferred = Q.defer();

  indexer.indexRowsLeft(tableName)
    .then(function () {
      var newFrom;
      if (from + INDEX_INTERVAL >= total) {
        deferred.resolve();
      } else {
        newFrom = from + INDEX_INTERVAL;
        tempReindex(newFrom, total, tableName);
      }
    });

  return deferred.promise;
}


indexer.indexTable = function (tableName) {
  connection.query('SELECT count(*) as total FROM ??', [tableName], function (err, results) {
    var from;
    var total;

    if (err) {
      throw err;
    }

    from = 0;
    total = results[0].total;

    temp(from, total, tableName);
  });
};

indexer.getRowsLeft = function (tableName) {
  var queryParams = [tableName, 'NO'];

  connection.query('SELECT count(*) as total FROM ?? WHERE indexado=?', queryParams,
    function (err, results) {
      var from;
      var total;

      if (err) {
        throw err;
      }

      from = 0;
      total = results[0].total;

      tempReindex(from, total, tableName);
    });
};


indexer.indexRowsRange = function (from, tableName) {
  var self = this;
  var deferred = Q.defer();
  var queryParams = [INDEX_FIELDS, tableName, from, 100];

  connection.query('SELECT ?? FROM ?? LIMIT ?,?', queryParams, function (err, rows) {
    var ids;

    if (err) {
      throw err;
    }

    ids = rows.map(function (a) {
      return a.id;
    });

    self.indexRows(rows, DOC_TYPES[tableName])
      .then(function () {
        self.updateRecord(ids, tableName).then(function () {
          deferred.resolve();
        });
      });
  });

  return deferred.promise;
};

indexer.indexRowsLeft = function (tableName) {
  var self = this;
  var deferred = Q.defer();
  var indexed = 'NO';
  var queryParams = ['a'];

  queryParams = [INDEX_FIELDS, tableName, indexed, 0, 100];

  connection.query('SELECT ?? FROM ?? WHERE indexado = ? LIMIT ?,?', queryParams,
    function (err, rows) {
      var ids;

      if (err) {
        throw err;
      }

      ids = rows.map(function (a) {
        return a.id;
      });

      self.indexRows(rows, DOC_TYPES[tableName])
        .then(function () {
          self.updateRecord(ids, tableName).then(function () {
            deferred.resolve();
          });
        });
    });

  return deferred.promise;
};

indexer.updateRecord = function (ids, tableName) {
  var deferred = Q.defer();
  var data = {
    indexado: 'SI'
  };
  var queryParams = [tableName, data, ids];

  connection.query('UPDATE ?? SET ? WHERE id IN (?)', queryParams,
    function (err) {
      if (err) {
        throw err;
      }
      deferred.resolve();
    });

  return deferred.promise;
};


indexer.perform = function () {
  var self = this;

  DOCUMENT_TABLES.forEach(function (tableName) {
    self.indexTable(tableName);
  });
};

indexer.reindex = function () {
  var self = this;
  DOCUMENT_TABLES.forEach(function (tableName) {
    self.getRowsLeft(tableName);
  });
};

module.exports = indexer;
