var
  elasticsearch = require('elasticsearch'),
  mysql = require('mysql'),

  indexer = {};

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

indexer.perform = function() {

  connection.query('SELECT * FROM legislations LIMIT 0,10', function (queryError, results, fields) {
    results.forEach(function(v, k){

      client.index({
        index: 'documento',
        type: 'legislacion',
        body: {
          title: v.titulo_norma,
          content: v.content,
          suggest: {
            input: v.titulo_norma.split(' '),
            output: v.titulo_norma,
            payload: {
              type: 'legislacion',
            }
          }
        }
      }, function (indexError, response) {
        console.log(response);
      });

    });
  });
};

module.exports = indexer;