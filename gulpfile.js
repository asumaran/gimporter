var
  gulp = require('gulp'),
  async = require('async'),
  cheerio = require('gulp-cheerio'),
  gimporter = require('./lib/gimporter'),
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

gulp.task('default', ['import'], function() {
  process.exit();
});
