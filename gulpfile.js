var
  gulp = require('gulp'),
  cheerio = require('gulp-cheerio'),
  gimporter = require('./lib/gimporter'),
  indexer = require('./lib/indexer'),
  elastic = require('./lib/elastic'),
  Q = require('q');

gulp.task('import', function () {
  return gulp
    .src(['xml/**/*.*','!xml/**/{POPUP,POPUP/**}'])
    .pipe(cheerio({
      parserOptions: {
        xmlMode: true
      },
      run: function ($, file, done) {
        console.log('Processing: ' + file.path);
        gimporter.processFile($, file)
          .then(function(){
            done();
          });
      }
    }));
});

gulp.task('process_template', function() {
  elastic.setTemplate();
});

gulp.task('index', function() {
  indexer.perform();
});

gulp.task('run', ['import', 'process_template', 'index']);

gulp.task('default', ['import'], function() {
  process.exit();
});
