var gulp = require('gulp');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');

gulp.task('build', function(){
    return gulp.src([
        'bower_components/js-cloudframework/js-cloudframework.js'
        ,'src/*'
        ])
        .pipe(concat('js-bloombees.js'))
        .pipe(gulp.dest('test/js'))
});

gulp.task('deploy', function(){
    if(gulp.src([
        'bower_components/js-cloudframework/js-cloudframework.js'
     ,'src/*'
     ])
    .pipe(concat('js-bloombees.js'))
    .pipe(gulp.dest('.'))) {
        return gulp.src([
            'js-bloombees.js'
        ])
        .pipe(concat('js-bloombees.min.js'))
        .pipe(uglify())
        .pipe(gulp.dest('.'));
    }
});

gulp.task('watch',function () {
    gulp.watch('src/*', ['build']);
});
// The development server (the recommended option for development)
gulp.task('serve', ['build','watch']);
