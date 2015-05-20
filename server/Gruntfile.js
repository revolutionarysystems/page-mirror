module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    haven: {
      ci: {
        cache: "./haven_cache"
      }
    },
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
          src: ['mongodb/**/*', 'body-parser/**/*', 'node-uuid/**/*', 'express/**/*', 'socket.io/**/*'],
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

  grunt.registerTask('build', ['clean', 'compress']);
  grunt.registerTask('dist', ['haven:update', 'build']);

  grunt.registerTask('deploy', ['dist', 'haven:deploy']);
  grunt.registerTask('ci', ['haven:ci:update', 'build', 'haven:deployOnly']);

  // Default task(s).
  grunt.registerTask('default', ['dist']);

};