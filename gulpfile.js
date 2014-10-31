// Build Dependencies
var gulp = require('gulp'),
    jshint = require('gulp-jshint'),
    clean = require('gulp-clean'),
    gutil = require('gulp-util'),
    concat = require('gulp-concat'),
    uglify = require('gulp-uglify'),
    header = require('gulp-header'),

    // File Paths
	dist = './build/min/',
	dev = './build/dev/',
	vendor = './src/vendor/',
	lib = './src/lib/',

	// Banner
    info = require('./package.json'),
	title = info.name,
	author = info.authors.join(', '),
	version = info.version,
	build = Date.now(),
	banner = '/*\n' + ' * ' + title + '\n' + ' * ' + author + '\n' + ' * ' + version + ':' + build + '\n */\n';

// Default
gulp.task('default', ['clean'], function() {
    gulp.start('hint', 'build');
});

// Building and Minifying
gulp.task('build', function() {
	gulp.src([ vendor + 'sockjs.js', vendor + 'stompjs.js', lib + 'comsock.js', lib + 'composite.js'])
		.pipe(concat('composite.js'))
		.pipe(header(banner))
		.pipe(gulp.dest(dev))
		.pipe(uglify())
		.pipe(header(banner))
		.pipe(gulp.dest(dist));
});

// JSHinting
gulp.task('hint', function() {
  return gulp.src('lib/*.js')
    .pipe(jshint('.jshintrc'))
    .pipe(jshint.reporter('default'));
});

// Pre-build cleanup
gulp.task('clean', function() {
  return gulp.src([dist], {read: false})
    .pipe(clean());
});

// Watch task
gulp.task('watch', function() {
	gulp.watch('./src/**/*.js', function(event) {
		gutil.log('Watch:', 'File ' + event.path + ' was ' + event.type + ', running tasks...');
		gulp.start('hint', 'build');
	});
});