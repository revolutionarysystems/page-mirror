module.exports = function(grunt) {

  function getModules(cmd) {
    return {
      'client': cmd,
      'mirror': cmd,
      'server': cmd,
      'service': cmd
    };
  }

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    subgrunt: {
      options: {
        limit: 1
      },
      dist: getModules("dist"),
      deploy: getModules("deploy"),
      ci: getModules("ci")
    },
  });

  grunt.loadNpmTasks('grunt-subgrunt');

  // Tasks
  grunt.registerTask('dist', ['subgrunt:dist']);
  grunt.registerTask('deploy', ['subgrunt:deploy']);

  grunt.registerTask('ci', ['subgrunt:ci']);

  // Default task(s).
  grunt.registerTask('default', ['deploy']);

};