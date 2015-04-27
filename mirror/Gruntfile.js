module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    haven: {
      ci: {
        cache: "./haven_cache"
      }
    },
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

  grunt.registerTask('build', ['clean', 'includes']);
  grunt.registerTask('dist', ['haven:update', 'build']);

  grunt.registerTask('deploy', ['dist', 'haven:deploy']);
  grunt.registerTask('ci', ['haven:ci:update', 'build', 'haven:deployOnly']);

  // Default task(s).
  grunt.registerTask('default', ['dist']);

};