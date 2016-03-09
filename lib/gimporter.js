var mysql = require('mysql');
var extend = require('extend');
var dotenv = require('dotenv');
var Q = require('q');

var LEGISLACION_CODE = '1';
var JURISPRUDENCIA_CODE = '3';
var CMSCONFIGEXCLUDES = ['titulo', 'keywords', 'datos_generales', 'Sumilla'];

var gimporter = {};
var connection = {};

dotenv.config();

connection = mysql.createConnection({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  port: process.env.DB_PORT || 3306,
  dateStrings: true
});

connection.connect();

function unwrap(childrens) {
  var escapedChildrens = [];

  childrens.forEach(function (children) {
    var els = [];
    var el = children;

    if (el.type === 'tag' && el.name === 'a') {
      if (el.children) {
        els = unwrap(el.children);
        Array.prototype.push.apply(escapedChildrens, els);
      } else {
        if (el.type === 'tag' && el.name === 'a') {
          el.children.forEach(function (_el) {
            escapedChildrens.push(_el);
          });
        } else {
          escapedChildrens.push(el);
        }
      }
    } else {
      escapedChildrens.push(el);
      if (el.children) {
        el.children = unwrap(el.children);
      }
    }
  });
  return escapedChildrens;
}

gimporter.updateRecord = function (data, tableName) {
  var deferred = Q.defer();
  var insertData = data;
  var queryParams = [];

  insertData.indexado = 'NO';
  insertData.is_new = 'NO';

  queryParams = [tableName, insertData, insertData.cms_id];

  connection.query('UPDATE ?? SET ? WHERE cms_id = ?', queryParams, function (err) {
    if (err) {
      throw err;
    }
    deferred.resolve();
  });

  return deferred.promise;
};

gimporter.addRecord = function (data, tableName) {
  var deferred = Q.defer();
  connection.query('INSERT INTO ?? SET ?', [tableName, data], function (err) {
    if (err) {
      throw err;
    }
    deferred.resolve();
  });
  return deferred.promise;
};

gimporter.insertFile = function (data, tableName) {
  var deferred = Q.defer();
  var self = this;
  var baseData = {
    created_at: new Date(),
    updated_at: new Date()
  };
  var queryParams = [tableName, data.cms_id];

  connection.query('SELECT * FROM ?? WHERE cms_id = ? LIMIT 1', queryParams, function (err, rows) {
    var data2 = {};

    if (err) {
      throw err;
    }

    data2 = extend(data, baseData);

    if (rows[0]) {
      self.updateRecord(data2, tableName).then(function () {
        deferred.resolve();
      });
    } else {
      self.addRecord(data2, tableName).then(function () {
        deferred.resolve();
      });
    }
  });
  return deferred.promise;
};

gimporter.getDataFromFile = function ($file, file) {
  var fileType = $file('view').attr('cms_collection_id');

  if (fileType === LEGISLACION_CODE) {
    return this.getLegislacionData($file, file);
  } else if (fileType === JURISPRUDENCIA_CODE) {
    return this.getJurisprudenciaData($file, file);
  }

  throw new Error('Archivo con cms_collection_id desconocido');
};

gimporter.getLegislacionData = function ($file, file) {
  var titleEl = $file('view > [cms_config="titulo"]');
  var keywordsEl = $file('[cms_config="keywords"]');
  var generalData = $file('[cms_config="datos_generales"]');
  var contentHtml = '';
  var contentText = '';
  var contentBuffer = [];
  var contentBufferText = [];
  var data = {};
  var $view = $file('view');

  $file('version').not(function (i, el) {
    return CMSCONFIGEXCLUDES.indexOf(el.attribs.cms_config) > -1;
  }).each(function (k, v) {
    var $el = $file(v);
    var childrens = [];

    $el.contents().each(function (i, el) {
      childrens.push(el);
    });

    $el[0].children = unwrap(childrens);

    contentBuffer.push($el.html());
    contentBufferText.push($el.text());
  });

  contentHtml = contentBuffer.join('');
  contentText = contentBufferText.join('');
  var title_temp;
  titleEl.find('*').each(function (i, el){
      title_temp.push(el.text);
  });

  title_temp = title_temp.join(" ");

  data = {
    titulo_norma: title_temp || '',
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
    source_file: file.relative,
    keywords: keywordsEl.text() || '',
    fecha_entrada_vigencia: generalData.attr('fecha_entrada_vigencia') || '',
    fecha_promulgacion: generalData.attr('fecha_promulgacion') || '',
    fecha_publicacion: generalData.attr('fecha_publicacion') || ''
  };

  return data;
};

gimporter.getJurisprudenciaData = function ($file, file) {
  var titleEl = $file('view > [cms_config="Sumilla"]');
  var contentHtml = '';
  var contentText = '';
  var contentBuffer = [];
  var contentBufferText = [];
  var data = {};
  var $view = $file('view');

  $file('version').not(function (i, el) {
    return CMSCONFIGEXCLUDES.indexOf(el.attribs.cms_config) > -1;
  }).each(function (k, v) {
    var $el = $file(v);
    var childrens = [];

    $el.contents().each(function (i, el) {
      childrens.push(el);
    });

    $el[0].children = unwrap(childrens);

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

gimporter.getTableName = function ($file) {
  var fileType = $file('view').attr('cms_collection_id');

  if (fileType === LEGISLACION_CODE) {
    return 'legislations';
  } else if (fileType === JURISPRUDENCIA_CODE) {
    return 'jurisprudencias';
  }

  throw new Error('Archivo con cms_collection_id desconocido');
};

gimporter.processFile = function ($, file) {
  var deferred = Q.defer();
  var data = this.getDataFromFile($, file);
  var tableName = this.getTableName($, file);

  this.insertFile(data, tableName).then(function () {
    deferred.resolve();
  });

  return deferred.promise;
};

module.exports = gimporter;
