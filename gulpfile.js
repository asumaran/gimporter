var gulp = require('gulp');
var cheerio = require('gulp-cheerio');
var gimporter = require('./lib/gimporter');
var indexer = require('./lib/indexer');
var elastic = require('./lib/elastic');
var eslint = require('gulp-eslint');
var gutil = require('gulp-util');
var chalk = require('chalk');

gulp.task('import', function () {
  return gulp
    .src(['xml/**/*.*', '!xml/**/{POPUP,POPUP/**}'])
    .pipe(cheerio({
      parserOptions: {
        xmlMode: true
      },
      run: function ($, file, done) {
        gutil.log(chalk.yellow('Processing:', file.path));
        gimporter.processFile($, file)
          .then(function () {
            done();
          });
      } }));
});

gulp.task('process_template', function () {
  elastic.setTemplate();
});

gulp.task('index', function () {
  indexer.perform();
});

gulp.task('reindex', function () {
  indexer.reindex();
});

gulp.task('lint', function () {
  return gulp.src(['**/*.js', '!node_modules/**'])
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(eslint.results(function (result) {
      if (!result.errorCount) {
        gutil.log(chalk.green('No errors found'));
      }
    }))
    .pipe(eslint.failAfterError());
});

gulp.task('lint-watch', function () {
  var lintAndPrint = eslint();

  lintAndPrint
    .pipe(eslint.formatEach())
    .pipe(eslint.result(function (result) {
      if (!result.errorCount) {
        gutil.log(chalk.green('No errors found'));
      }
    }));

  return gulp.watch('./lib/**/*.js', function (event) {
    if (event.type !== 'deleted') {
      gulp.src(event.path)
        .pipe(lintAndPrint, {
          end: false
        });
    }
  });
});

gulp.task('default', ['import'], function () {
  process.exit();
});
