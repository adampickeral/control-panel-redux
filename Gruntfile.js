module.exports = function (grunt) {

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    babel: {
      src: {
        files: [
          {
            expand: true,
            cwd: 'src',
            src: ['**/*.jsx', '**/*.js'],
            dest: 'transpiled',
            ext: '.js'
          }
        ]
      }
    },

    clean: {
      transpiled: ['transpiled'],
      dist: ['control-panel-redux.js']
    },

    watch: {
      all: {
        files: [
          'src/**/*.jsx',
          'src/**/*.js'
        ],
        tasks: ['build'],
        options: {
          spawn: false
        }
      }
    },

    browserify: {
      release: {
        files: {
          'control-panel-redux.js': ['transpiled/index.js']
        }
      }
    },

    eslint: {
      target: ['src/**/*']
    }

  });

  grunt.loadNpmTasks('grunt-eslint');
  grunt.loadNpmTasks('grunt-babel');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-browserify');

  grunt.registerTask('build', [
    'clean:transpiled',
    'babel:src',
    'babel:demo',
    'browserify:demo'
  ]);

  grunt.registerTask('lint', ['eslint']);

  grunt.registerTask('default', ['build']);

};
