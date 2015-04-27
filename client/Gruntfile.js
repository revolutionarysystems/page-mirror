module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    haven: {
      ci: {
        cache: "./haven_cache"
      }
    }
  });

  grunt.loadNpmTasks('grunt-haven');

  // Tasks  

  grunt.registerTask('dist', ['haven:update']);
  grunt.registerTask('deploy', ['haven:update', 'haven:deploy']);
  grunt.registerTask('ci', ['haven:ci:update', 'haven:deployOnly']);

  // Default task(s).
  grunt.registerTask('default', ['deploy']);

};