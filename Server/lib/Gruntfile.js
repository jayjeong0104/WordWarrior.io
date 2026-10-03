const LICENSE = [
	"Rule the words! KKuTu Online",
	"Copyright (C) 2017 JJoriping(op@jjo.kr)",
	"",
	"This program is free software: you can redistribute it and/or modify",
	"it under the terms of the GNU General Public License as published by",
	"the Free Software Foundation, either version 3 of the License, or",
	"(at your option) any later version.",
	"",
	"This program is distributed in the hope that it will be useful,",
	"but WITHOUT ANY WARRANTY; without even the implied warranty of",
	"MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the",
	"GNU General Public License for more details.",
	"",
	"You should have received a copy of the GNU General Public License",
	"along with this program. If not, see <http://www.gnu.org/licenses/>."
].join('\n');

var BuildClient = require('../../tools/build_client');

const LIST = [
	"global",
	
	"in_login",
	"in_game_kkutu_help",
	"in_admin",
	"in_portal",
	"in_loginfail"
];
module.exports = function(grunt){
	var i, files = {};
	
	for(i in LIST){
		files["Web/public/js/"+LIST[i]+".min.js"] = "Web/lib/"+LIST[i]+".js";
	}
	
	grunt.initConfig({
		uglify: {
			options: {
				banner: "/**\n" + LICENSE + "\n*/\n\n"
			},
			build: {
				files: files
			}
		}
	});
	grunt.loadNpmTasks('grunt-contrib-uglify');

	grunt.registerTask('client', 'Build both game clients from the authoritative split sources.', function(){
		BuildClient.buildClient();
	});
	grunt.registerTask('concat', ['client']);
	grunt.registerTask('default', ['client', 'uglify']);
	grunt.registerTask('pack', ['client']);
};
