
module.exports = function(grunt) {
  grunt.loadNpmTasks('grunt-bower-task');
  grunt.initConfig({
    bower: {
      install: {
        options: {
          targetDir: './app/vendor'
        }
      }
    }
  });
};
