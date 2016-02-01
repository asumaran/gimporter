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
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  port: process.env.DB_PORT || 3306,
  dateStrings: true
});

connection.connect();

gimporter.updateRecord = function (data,tableName) {
    var deferred = Q.defer();
    data.indexado = 'NO';
    data.is_new = 'NO';

    connection.query('UPDATE ?? SET ? WHERE cms_id = ?', [tableName, data, data.cms_id], function (err, rows, fields) {
      if (err) {
        throw err;
      }
      deferred.resolve();
    });

    return deferred.promise;
};

gimporter.addRecord = function (data,tableName) {
    var deferred = Q.defer();
    connection.query('INSERT INTO ?? SET ?', [tableName, data], function (err, rows, fields) {
      if (err) {
        throw err;
      }
      deferred.resolve();
    });
    return deferred.promise;
};


gimporter.insertFile = function(data, tableName) {
  var deferred = Q.defer();
  var self = this;
  var baseData = {
    created_at: new Date(),
    updated_at: new Date()
  };
  var q = connection.query('SELECT * FROM ?? WHERE cms_id = ? LIMIT 1', [tableName, data.cms_id], function (err, rows) {
    if (err) {
      throw err;
    }
    var data2 = extend(data, baseData);
    if(rows[0]){
        self.updateRecord(data2,tableName).then(function () {
          deferred.resolve();
        });

    }else{
      self.addRecord(data2,tableName).then(function () {
          deferred.resolve();
      });

    }
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
  var data_elements = [];

  $file('version').not(function(i, el){
    return cmsConfigExcludes.indexOf(el.attribs.cms_config) > -1;
  }).each(function (k, v) {
    var $el = $file(v);
    var element = {
      c_cms_id: $el[0].attribs.cms_id,
      c_cms_config_id: $el[0].attribs.cms_config_id,
      c_cms_id: $el[0].attribs.cms_id,
      c_cms_is_last: $el[0].attribs.cms_is_last,
      c_cms_link_id: $el[0].attribs.cms_link_id,
      c_cms_name: $el[0].attribs.cms_name,
      c_cms_parent_id: $el[0].attribs.cms_parent_id,
      c_cms_parent_name: $el[0].attribs.cms_parent_name,
      content_hmtl: $el.html(),
      content: $el.text()
    };
    data_elements.push(element);
    contentBuffer.push($el.html());
    contentBufferText.push($el.text());
  });

  contentHtml = contentBuffer.join('');
  contentText = contentBufferText.join('');

  data = {
    titulo_norma: titleEl.text() || '',
    titulo_norma_html: titleEl.html() || '',
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
  var data_elements = [];

  $file('version').not(function(i, el){
    return cmsConfigExcludes.indexOf(el.attribs.cms_config) > -1;
  }).each(function (k, v) {
    var $el = $file(v);
    var element = {
      c_cms_id: $el[0].attribs.cms_id,
      c_cms_config_id: $el[0].attribs.cms_config_id,
      c_cms_id: $el[0].attribs.cms_id,
      c_cms_is_last: $el[0].attribs.cms_is_last,
      c_cms_link_id: $el[0].attribs.cms_link_id,
      c_cms_name: $el[0].attribs.cms_name,
      c_cms_parent_id: $el[0].attribs.cms_parent_id,
      c_cms_parent_name: $el[0].attribs.cms_parent_name,
      content_hmtl: $el.html(),
      content: $el.text()
    };
    data_elements.push(element);
    contentBuffer.push($el.html());
    contentBufferText.push($el.text());
  });

  contentHtml = contentBuffer.join('');
  contentText = contentBufferText.join('');

  data = {
    titulo_norma: titleEl.text() || '',
    titulo_norma_html: titleEl.html() || '',
    content_html: contentHtml,
    content: contentText,
    numero_norma: $view.attr('numero'),
    anio: $view.attr('anio') || '',
    tipo_norma_jurisp: $view.attr('tipo_norma_jurisp'),
    emisor_jurisp: $view.attr('emisor_jurisp') || '',
    cms_collection_name: $view.attr('cms_collection_name'),
    cms_config_id: $view.attr('cms_config_id'),
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
