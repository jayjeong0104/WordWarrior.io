/**
 * Rule the words! KKuTu Online
 * Copyright (C) 2017 JJoriping(op@jjo.kr)
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */

var Cluster = require("cluster");
var CPU = Number(process.argv[2]); //require("os").cpus().length;

if(!isFinite(CPU) || CPU % 1 || CPU < 1){
	console.log(`Invalid CPU Number ${CPU}`);
	return;
	// process.exit(1);
}
if(Cluster.isMaster){
	var workers = Object.create(null);
	for(var i=0; i<CPU; i++){
		workers[i + 1] = Cluster.fork({ SERVER_NO_FORK: true, WS_KEY: i+1 });
	}
	Cluster.on('exit', function(w){
		console.log(`Worker ${w.process.pid} died`);
		Object.keys(workers).forEach(function(key){
			if(workers[key] === w) workers[key] = Cluster.fork({ SERVER_NO_FORK: true, WS_KEY: Number(key) });
		});
	});
}else{
	require("./main.js");
}
