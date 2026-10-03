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

var MainDB	 = require("../db");
var JLog	 = require("../../sub/jjlog");
var Inventory = require("../../sub/inventory");

exports.run = function(Server, page){

Server.post("/consume/:id", function(req, res){
	if(!req.session.profile) return res.json({ error: 400 });
	var uid = req.session.profile.id;
	var gid = req.params.id;
	if([ 'boxB2', 'boxB3', 'boxB4', 'dictPage' ].indexOf(gid) === -1) return res.json({ error: 430 });
	
	MainDB.users.findOne([ '_id', uid ]).on(function($user){
		if(!$user) return res.json({ error: 400 });
		if(!$user.box) return res.json({ error: 400 });
		var before = Inventory.snapshot($user, [ 'box', 'kkutu.score' ]);
		if(!$user.lastLogin) $user.lastLogin = new Date().getTime();
		var output;
		
		if(!Inventory.quantity($user.box, gid)) return res.json({ error: 430 });
		if(typeof $user.kkutu == "string"){
			try { $user.kkutu = JSON.parse($user.kkutu); } catch(e) { return res.json({ error: 400 }); }
		}
		if(!$user.kkutu || typeof $user.kkutu != "object") return res.json({ error: 400 });
		$user.kkutu.score = Number($user.kkutu.score) || 0;
		if(!Number.isFinite($user.kkutu.score) || $user.kkutu.score < 0) return res.json({ error: 400 });
		MainDB.kkutu_shop.findOne([ '_id', gid ]).limit([ 'cost', true ]).on(function($item){
			if(!$item) return res.json({ error: 430 });
			Inventory.consume($user.box, gid, 1, true);
			output = useItem($user, $item, gid);
			Inventory.save(MainDB.users, uid, before, [ [ 'box', $user.box ], [ 'kkutu.score', $user.kkutu.score ], [ 'lastLogin', $user.lastLogin ] ], function(err){
				if(err) return res.json({ error: err.code === 409 ? 409 : 500 });
				output.result = 200;
				output.box = $user.box;
				output.data = $user.kkutu;
				res.send(output);
			});
		});
	});
});

};
function useItem($user, $item, gid){
	var R = { gain: [] };
	
	switch($item._id){
		case 'boxB2':
			got(pick([ 'b2_fire', 'b2_metal' ]), 1, 604800);
			break;
		case 'boxB3':
			got(pick([ 'b3_do', 'b3_hwa', 'b3_pok' ]), 1, 604800);
			break;
		case 'boxB4':
			got(pick([ 'b4_bb', 'b4_hongsi', 'b4_mint' ]), 1, 604800);
			break;
		case 'dictPage':
			R.exp = Math.round(Math.sqrt(1 + 2 * ($user.kkutu.score || 0)));
			$user.kkutu.score += R.exp;
			break;
		default:
			JLog.warn(`Unhandled consumption type: ${$item._id}`);
	}
	function got(key, value, term){
		Inventory.obtain($user.box, key, value, term);
		R.gain.push({ key: key, value: value });
	}
	function pick(arr){
		return arr[Math.floor(Math.random() * arr.length)];
	}
	return R;
}
