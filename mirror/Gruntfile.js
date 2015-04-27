module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    clean: ["dist/*"],
    includes: {
      js: {
        options: {
          includeRegexp: /^(\s*)include\s+"(\S+)"\s*$/,
          duplicates: false,
          debug: false
        },
        files: [{
          cwd: 'src/',
          src: ['mirror.js', 'player.js'],
          dest: 'dist/',
        }],
      },
    },
  });

  grunt.loadNpmTasks('grunt-haven');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-includes');

  grunt.registerTask('build', ['clean', 'haven:update', 'includes']);
  grunt.registerTask('dist', ['build']);

  grunt.registerTask('deploy', ['dist', 'haven:deploy']);
  grunt.registerTask('ci', ['dist', 'haven:deployOnly']);

  // Default task(s).
  grunt.registerTask('default', ['dist']);

};