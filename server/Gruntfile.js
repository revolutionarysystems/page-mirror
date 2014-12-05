module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    clean: ["dist"],
    compress: {
      dist: {
        options: {
          mode: "tgz",
          archive: 'dist/page-mirror-server.tar.gz'
        },
        files: [{
          expand: true,
          cwd: "src",
          src: ['**/*'],
          dest: '',
        },{
          expand: true,
          cwd: "haven_artifacts/main/mutation-summary-tree-mirror",
          src: ['**/*'],
          dest: 'static/',
        },{
          expand: true,
          cwd: "node_modules",
          src: ['easyrtc/**/*', 'express/**/*', 'socket.io/**/*'],
          dest: 'node_modules/'
        }]
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-compress');
  grunt.loadNpmTasks('grunt-haven');

  grunt.registerTask('build', ['haven:update', 'clean']);
  grunt.registerTask('dist', ['build', 'compress']);

  grunt.registerTask('deploy', ['dist', 'haven:deploy']);
  grunt.registerTask('ci', ['dist', 'haven:deployOnly']);

  // Default task(s).
  grunt.registerTask('default', ['dist']);

};