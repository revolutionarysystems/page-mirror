module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    clean: ["demo-dist"],
    copy: {
      demo: {
        files: [{
          expand: true,
          cwd: 'client',
          src: ['**/*'],
          dest: 'dist/static/'
        },{
          expand: true,
          cwd: 'demo',
          src: ['**/*'],
          dest: 'dist/static/'
        },{
          expand: true,
          cwd: 'lib',
          src: ['**/*'],
          dest: 'dist/static/'
        },{
          expand: true,
          cwd: 'mirror',
          src: ['**/*'],
          dest: 'dist/static/mirror/'
        },{
          expand: true,
          cwd: 'server',
          src: ['**/*'],
          dest: 'dist/'
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