module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
  });

  grunt.loadNpmTasks('grunt-haven');

  // Tasks  

  grunt.registerTask('dist', ['haven:update']);
  grunt.registerTask('deploy', ['haven:update', 'haven:deploy']);
  grunt.registerTask('ci', ['haven:update', 'haven:deployOnly']);

  // Default task(s).
  grunt.registerTask('default', ['deploy']);

};