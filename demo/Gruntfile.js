module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    clean: ["build", "dist"],
    copy: {
      demo: {
        files: [{
          expand: true,
          cwd: '../client/src',
          src: ['**/*'],
          dest: 'build/static/'
        },{
          expand: true,
          cwd: '../client/haven_artifacts/main/mutation-summary',
          src: ['**/*'],
          dest: 'build/static/'
        },{
          expand: true,
          cwd: '../client/haven_artifacts/main/mutation-summary-tree-mirror',
          src: ['**/*'],
          dest: 'build/static/'
        },{
          expand: true,
          cwd: '../client/haven_artifacts/main/kinesis-js',
          src: ['**/*'],
          dest: 'build/static/'
        },{
          expand: true,
          cwd: '../client/haven_artifacts/main/cryptojs',
          src: ['**/*'],
          dest: 'build/static/'
        },{
          expand: true,
          cwd: '../client/haven_artifacts/main/utils-ajax',
          src: ['**/*'],
          dest: 'build/static/'
        },{
          expand: true,
          cwd: 'src/static',
          src: ['**/*'],
          dest: 'build/static/'
        },{
          expand: true,
          cwd: 'lib',
          src: ['**/*'],
          dest: 'build/static/'
        },{
          expand: true,
          cwd: '../mirror/dist',
          src: ['**/*'],
          dest: 'build/static/'
        },{
          expand: true,
          cwd: 'src/server',
          src: ['**/*'],
          dest: 'build/'
        },{
          expand: true,
          cwd: 'node_modules/angular',
          src: ['angular.js'],
          dest: 'build/static/'
        }]
      }
    },compress: {
      demo: {
        options: {
          mode: "tgz",
          archive: 'dist/page-mirror-demo.tar.gz'
        },
        files: [{
            expand: true,
            src: ['dist/**/*'],
            dest: '',
          },{
            expand: true,
            src: ['node_modules/**/*'],
            dest: '',
          }
        ]
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-compress');
  grunt.loadNpmTasks('grunt-haven');

  grunt.registerTask('build', ['clean', 'copy']);
  grunt.registerTask('dist', ['clean', 'copy', 'compress']);

  // Default task(s).
  grunt.registerTask('default', ['build']);

};