module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    haven: {
      ci: {
        cache: "./haven_cache"
      }
    },
    clean: ["build", "dist"],
    copy: {
      dist: {
        files: [{
          expand: true,
          cwd: "src",
          src: ['**/*'],
          dest: 'build',
        },{
          expand: true,
          cwd: "../data/src",
          src: ['**/*'],
          dest: 'build',
        }]
      }
    },
    compress: {
      dist: {
        options: {
          mode: "tgz",
          archive: 'dist/page-mirror-server.tar.gz'
        },
        files: [{
          expand: true,
          cwd: "build",
          src: ['**/*'],
          dest: '',
        },{
          expand: true,
          cwd: "node_modules",
          src: ['mongodb/**/*', 'aws-kcl/**/*', 'async/**/*', 'node-uuid/**/*', 'aws-sdk/**/*', 'request/**/*', 's3-upload-stream/**/*', 'MD5/**/*'],
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

  grunt.registerTask('build', ['clean', 'copy']);
  grunt.registerTask('dist', ['build', 'compress']);

  grunt.registerTask('deploy', ['haven:update', 'dist', 'haven:deploy']);
  grunt.registerTask('ci', ['haven:ci:update', 'dist', 'haven:deployOnly']);

  // Default task(s).
  grunt.registerTask('default', ['dist']);

};