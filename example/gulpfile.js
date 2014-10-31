/**
 *	This is used to build main.scss -> main.css and nothing more!
 */
var gulp = require('gulp'),
    sass = require('gulp-ruby-sass'),
    autoprefixer = require('gulp-autoprefixer');

gulp.task('default', function() {
    gulp.start('styles');
    gulp.start('nyan_styles');
    gulp.start('button_styles');
});

gulp.task('styles', function() {
  return gulp.src('main.scss')
    .pipe(sass({ style: 'expanded' }))
    .pipe(autoprefixer('last 2 version', 'safari 5', 'ie 9', 'opera 12.1', 'ios 6', 'android 4'))
    .pipe(gulp.dest('./'));
});

gulp.task('nyan_styles', function() {
  return gulp.src('nyan.scss')
    .pipe(sass({ style: 'expanded' }))
    .pipe(autoprefixer('last 2 version', 'safari 5', 'ie 9', 'opera 12.1', 'ios 6', 'android 4'))
    .pipe(gulp.dest('./'));
});

gulp.task('button_styles', function() {
  return gulp.src('button.scss')
    .pipe(sass({ style: 'expanded' }))
    .pipe(autoprefixer('last 2 version', 'safari 5', 'ie 9', 'opera 12.1', 'ios 6', 'android 4'))
    .pipe(gulp.dest('./'));
});

gulp.task('watch', function() {
    gulp.watch(['*'], ['styles'],['nyan_styles'],['button_styles']);

});
