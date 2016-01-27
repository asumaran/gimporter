var
  elasticsearch = require('elasticsearch'),
  mysql = require('mysql'),
  Q = require('q');

  LEGISLACION_TABLE = 'legislations',
  JURISPRUDENCIA_TABLE = 'jurisprudencias',

  INDEX_DOCUMENT = 'documento',

  INDEX_INTERVAL = 100,

  FIELD_TITULO_NORMA = 'titulo_norma',
  FIELD_CONTENT = 'content',
  FIELD_ID = 'id',

  INDEX_FIELDS = [FIELD_ID, FIELD_TITULO_NORMA, FIELD_CONTENT],
  DOCUMENT_TABLES = [LEGISLACION_TABLE, JURISPRUDENCIA_TABLE],

  indexer = {},
  DOC_TYPES = {};

  DOC_TYPES[LEGISLACION_TABLE] = 'legislacion';
  DOC_TYPES[JURISPRUDENCIA_TABLE] = 'jurisprudencias';

var connection = mysql.createConnection({
  host : process.env.DB_HOST || '127.0.0.1',
  user : process.env.DB_USER,
  password : process.env.DB_PASSWORD,
  database : process.env.DB_DATABASE,
  port : process.env.DB_PORT || 3306,
  dateStrings : true
});

connection.connect();

var client = new elasticsearch.Client({
  host: 'localhost:9200'
});

indexer.indexRows = function (rows, docType) {
  var deferred = Q.defer(),
    data = [];



  rows.map(function(item) {
    var content = item.content.trim(),
      title = item.titulo_norma.trim(),
      id = item.id;

    var docData = {
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

    var docAction = {
      index: {
        _index: INDEX_DOCUMENT,
        _type: docType,
        _id: id,
      }
    };

    data.push(docAction);
    data.push(docData);
  });

  client.bulk({
    body: data
  }, function(err, response) {
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
    .then(function() {
      if (from + INDEX_INTERVAL >= total) {
        deferred.resolve();
      } else {
        var newFrom = from + INDEX_INTERVAL;
        temp(newFrom, total, tableName);
      }
    });
  return deferred.promise;
}

function temp_reindex(from, total, tableName){
  var deferred = Q.defer();
  indexer.indexRowsLeft( tableName)
    .then(function() {
      if (from + INDEX_INTERVAL >= total) {
        deferred.resolve();
      } else {
        var newFrom = from + INDEX_INTERVAL;
        temp_reindex(newFrom, total, tableName);
      }
    });
  return deferred.promise;
}


indexer.indexTable = function (tableName) {
  var self = this,
    docType = DOC_TYPES[tableName];

  connection.query('SELECT count(*) as total FROM ??', [tableName], function(err, results) {
    if (err) {
      throw err;
    }

    var from = 0,
      total = results[0].total;

    temp(from, total, tableName)
      .then(function() {
      });
  });
};

indexer.getRowsLeft = function(tableName){
  var self = this,
    docType = DOC_TYPES[tableName];

  connection.query('SELECT count(*) as total FROM ?? WHERE indexado=?', [tableName,'NO'], function(err, results) {
    if (err) {
      throw err;
    }
  
    var from = 0,
      total = results[0].total;
    
    temp_reindex(from, total, tableName)
      .then(function() {
      });
    
  });
};


indexer.indexRowsRange =  function(from, tableName) {
  var self = this,
    deferred = Q.defer();

  var q = connection.query('SELECT ?? FROM ?? LIMIT ?,?', [INDEX_FIELDS, tableName, from, 100], function (err, rows) {
    if (err) {
      throw err;
    }

    self.indexRows(rows, DOC_TYPES[tableName])
      .then(function () {
        deferred.resolve();
      });
  });

  return deferred.promise;
}

indexer.indexRowsLeft = function( tableName) {
  var self = this,
    deferred = Q.defer();

  var q = connection.query('SELECT ?? FROM ?? WHERE indexado = ? LIMIT ?,?', [INDEX_FIELDS, tableName, 'NO', 0, 100], function (err, rows) {
    if (err) {
      throw err;
    }
    var ids = rows.map(function(a) {return a.id;});

    self.indexRows(rows, DOC_TYPES[tableName])
      .then(function () {
        self.updateRecord(ids,tableName).then(function(){
             deferred.resolve();
        });
      });
  });

  return deferred.promise;
}

indexer.updateRecord = function (ids,tableName) {
  var deferred = Q.defer();
  var data  = {indexado: 'SI'};
  var q = connection.query('UPDATE ?? SET ? WHERE id IN (?)', [tableName, data, ids], function (err, rows, fields) {
      if (err) {
        throw err;
      }
      deferred.resolve();
    });
    return deferred.promise;
};


indexer.perform = function() {
  var self = this;

  DOCUMENT_TABLES.forEach(function (tableName) {
    self.indexTable(tableName);
  });
};

indexer.reindex = function () {
  var self = this;
  DOCUMENT_TABLES.forEach(function (tableName){
    self.getRowsLeft(tableName);
  });
}

module.exports = indexer;