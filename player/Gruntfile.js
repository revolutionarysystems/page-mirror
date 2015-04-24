module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
  });

  grunt.loadNpmTasks('grunt-haven');

  grunt.registerTask('dist', ['haven:update']);

  grunt.registerTask('deploy', ['dist', 'haven:deploy']);
  grunt.registerTask('ci', ['dist', 'haven:deployOnly']);

  // Default task(s).
  grunt.registerTask('default', ['dist']);

};