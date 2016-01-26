var
  mysql = require('mysql'),
  extend = require('extend'),
  dotenv = require('dotenv'),
  Q = require('q'),

  LEGISLACION_CODE = '1',
  JURISPRUDENCIA_CODE = '3',

  gimporter = function(){};

dotenv.config();

var connection = mysql.createConnection({
  host : process.env.DB_HOST || '127.0.0.1',
  user : process.env.DB_USER,
  password : process.env.DB_PASSWORD,
  database : process.env.DB_DATABASE,
  port : process.env.DB_PORT || 3306,
  dateStrings : true
});

connection.connect();

gimporter.insertFile = function(data, tableName) {
  var deferred = Q.defer();
  var baseData = {
    created_at: new Date(),
    updated_at: new Date()
  };

  var data2 = extend(data, baseData);
  connection.query('INSERT INTO ' + tableName + ' SET ?', data2, function (err, rows, fields) {
    if (err) {
      throw err;
    }
    deferred.resolve();
  });

  return deferred.promise;
};

gimporter.getDataFromFile = function($file, file) {
  var fileType = $file('view').attr('cms_collection_id');

  if (fileType === LEGISLACION_CODE) {
    return this.getLegislacionData($file, file);
  }
  else if (fileType === JURISPRUDENCIA_CODE) {
    return this.getJurisprudenciaData($file, file);
  }

  throw 'Archivo con cms_collection_id desconocido';
};

gimporter.getLegislacionData = function($file, file) {
  var cmsConfigExcludes = ['titulo', 'keywords', 'datos_generales'];
  var titleEl = $file('view > [cms_config="titulo"]');
  var contentHtml = '';
  var contentText = '';
  var contentBuffer = [];
  var contentBufferText = [];
  var data = {};
  var $view = $file('view');

  $file('version').not(function(i, el){
    return cmsConfigExcludes.indexOf(el.attribs.cms_config) > -1;
  }).each(function (k, v) {
    var $el = $file(v);
    contentBuffer.push($el.html());
    contentBufferText.push($el.text());
  });

  contentHtml = contentBuffer.join('');
  contentText = contentBufferText.join('');

  data = {
    titulo_norma: titleEl.text() || '',
    titulo_norma_html: titleEl.html() || '',
     //Add en laravel
    //field longtext
    content_html: contentHtml,
    content: contentText,
    number: $view.attr('number'),
    anio: $view.attr('anio') || '',
    tipo_norma: $view.attr('tipo_norma'),
    org_emisor: $view.attr('org_emisor') || '',
    cms_collection_name: $view.attr('cms_collection_name'),
    cms_collection_id: $view.attr('cms_collection_id'),
    cms_config_id: $view.attr('cms_config_id'),
    cms_config: $view.attr('cms_config'),
    cms_id: $view.attr('cms_id'),
    cms_parent_name: $view.attr('cms_parent_name'),
    source_file: file.relative
  };

  return data;
};

gimporter.getJurisprudenciaData = function($file, file) {
  var cmsConfigExcludes = ['datos_generales'];
  var titleEl = $file('view > [cms_config="Sumilla"]');
  var contentHtml = '';
  var contentText = '';
  var contentBuffer = [];
  var contentBufferText = [];
  var data = {};
  var $view = $file('view');

  $file('version').not(function(i, el){
    return cmsConfigExcludes.indexOf(el.attribs.cms_config) > -1;
  }).each(function (k, v) {
    var $el = $file(v);
    contentBuffer.push($el.html());
    contentBufferText.push($el.text());
  });

  contentHtml = contentBuffer.join('');
  contentText = contentBufferText.join('');

  data = {
    titulo_norma: titleEl.text() || '',
    titulo_norma_html: titleEl.html() || '',
    //Add en laravel
    //field longtext
    content_html: contentHtml,
    content: contentText,
    //Add Laravel
    // size 25
    numero_norma: $view.attr('numero'),
    //Add Laravel
    // size 20
    anio: $view.attr('anio') || '',
    tipo_norma_jurisp: $view.attr('tipo_norma_jurisp'),
    emisor_jurisp: $view.attr('emisor_jurisp') || '',
    cms_collection_name: $view.attr('cms_collection_name'),
    //Add en Laravel
    //cms_collection_id: $view.attr('cms_collection_id'),
    cms_config_id: $view.attr('cms_config_id'),
    //Add en Laravel cms_config 20
    cms_config: $view.attr('cms_config'),
    cms_id: $view.attr('cms_id'),
    cms_parent_name: $view.attr('cms_parent_name'),
    source_file: file.relative
  };

  return data;
};

gimporter.getTableName = function($file, file) {
  var fileType = $file('view').attr('cms_collection_id');

  if (fileType === LEGISLACION_CODE) {
    return 'legislations';
  }
  else if (fileType === JURISPRUDENCIA_CODE) {
    return 'jurisprudencias';
  }

  throw 'Archivo con cms_collection_id desconocido';
};

gimporter.processFile = function($, file) {
  var deferred = Q.defer();
  var data = this.getDataFromFile($, file);

  var tableName = this.getTableName($,file);
  this.insertFile(data, tableName).then(function(){
    deferred.resolve();
  });

  return deferred.promise;
};

module.exports = gimporter;
