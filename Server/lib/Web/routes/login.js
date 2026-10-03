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

const MainDB	 = require("../db");
const JLog	 = require("../../sub/jjlog");
// const Ajae	 = require("../../sub/ajaejs").checkAjae;
const passport = require('passport');
const glob = require('glob-promise');
const GLOBAL	 = require("../../sub/global.json");
const config = require('../../sub/auth.json');
const path = require('path')
const DEFAULT_JOINED_AT = Date.UTC(2026, 3, 17);

function getSavedNickname(user){
    if(!user || !user.kkutu) return "";
    var kkutu = user.kkutu;
    if(typeof kkutu == "string"){
        try{
            kkutu = JSON.parse(kkutu);
        }catch(e){
            return "";
        }
    }
    if(!kkutu || typeof kkutu != "object") return "";
    var name = kkutu.name || kkutu.title || "";
    if(typeof name != "string") return "";
    name = name.trim();
    return name ? name : "";
}
function hasSavedJoinedAt(user){
    if(!user || !user.kkutu) return false;
    var kkutu = user.kkutu;
    if(typeof kkutu == "string"){
        try{
            kkutu = JSON.parse(kkutu);
        }catch(e){
            return false;
        }
    }
    return !!(kkutu && typeof kkutu == "object" && Number(kkutu.joinedAt));
}
function normalizeProfileImageValue(value){
    var image = value;
    if(image && typeof image == "object"){
        image = image.url || image.value || image.image || "";
    }
    if(typeof image != "string") return "";
    image = image.trim();
    if(!image || image == "[object Object]" || image == "undefined" || image == "null") return "";
    if(image.indexOf("//") === 0) image = "https:" + image;
    if(/^http:\/\//i.test(image)) image = "https://" + image.slice(7);
	if(!/^https?:\/\//i.test(image) && image[0] !== "/" && !/^data:image\//i.test(image)) return "";
	return image;
}
function isGoogleProfileImageHost(host){
	host = (host || "").toLowerCase();
	return /(^|\.)googleusercontent\.com$/.test(host)
		|| /(^|\.)ggpht\.com$/.test(host)
		|| /(^|\.)googleapis\.com$/.test(host)
		|| /(^|\.)google\.com$/.test(host)
		|| /(^|\.)gstatic\.com$/.test(host);
}
function proxifyProfileImageValue(value){
	var image = normalizeProfileImageValue(value);
	if(!image) return "";
	if(/^https?:\/\//i.test(image)){
		try{
			if(isGoogleProfileImageHost((new URL(image)).hostname)){
				return "/profile-image?u=" + encodeURIComponent(image);
			}
		}catch(e){}
	}
	return image;
}
function getGoogleProfileFallbackById(pid){
	pid = String(pid || "").trim();
	if(!pid || /^https?:\/\//i.test(pid) || pid.indexOf("/") != -1) return "";
	return "https://profiles.google.com/s2/photos/profile/" + encodeURIComponent(pid) + "?sz=256";
}

function process(req, accessToken, MainDB, $p, done) {
	$p.token = accessToken;
	$p.sid = req.session.id;
	$p.image = proxifyProfileImageValue($p.image || $p.picture || $p.photo);
	if(!$p.image && String($p.authType || "").toLowerCase() == "google"){
		$p.image = proxifyProfileImageValue(getGoogleProfileFallbackById($p.id));
	}
    var rawUsername = ($p.name || $p.title || "");
    if(typeof rawUsername !== "string") rawUsername = String(rawUsername || "");
    $p.username = rawUsername.trim();

    let now = Date.now();
    $p.sid = req.session.id;
    req.session.admin = GLOBAL.ADMIN.includes($p.id);
    req.session.authType = $p.authType;
    MainDB.users.findOne([ '_id', $p.id ]).limit([ 'kkutu', true ]).on(($body) => {
        var savedName = getSavedNickname($body);
        var needsJoinedAt = !hasSavedJoinedAt($body);
        if(savedName) $p.title = savedName;
        MainDB.session.upsert([ '_id', req.session.id ]).set({
            'profile': $p,
            'createdAt': now
        }).on();
        req.session.profile = $p;
        if(savedName){
            MainDB.users.update([ '_id', $p.id ]).set(
                [ 'lastLogin', now ],
                [ 'kkutu.username', $p.username ],
                needsJoinedAt ? [ 'kkutu.joinedAt', DEFAULT_JOINED_AT ] : undefined
            ).on();
        }else{
            MainDB.users.update([ '_id', $p.id ]).set(
                [ 'lastLogin', now ],
                [ 'kkutu.name', $p.title || $p.name ],
                [ 'kkutu.username', $p.username ],
                needsJoinedAt ? [ 'kkutu.joinedAt', DEFAULT_JOINED_AT ] : undefined
            ).on();
        }
        done(null, $p);
    });
}

exports.run = (Server, page) => {
    //passport configure
    passport.serializeUser((user, done) => {
        done(null, user);
    });

    passport.deserializeUser((obj, done) => {
        done(null, obj);
    });

    const strategyList = {};
    
	for (let i in config) {
		try {
			let auth = require(path.resolve(__dirname, '..', 'auth', 'auth_' + i + '.js'))
			Server.get('/login/' + auth.config.vendor, passport.authenticate(auth.config.vendor))
			Server.get('/login/' + auth.config.vendor + '/callback', passport.authenticate(auth.config.vendor, {
				successRedirect: '/',
				failureRedirect: '/loginfail'
			}))
			passport.use(new auth.config.strategy(auth.strategyConfig, auth.strategy(process, MainDB /*, Ajae */)));
			strategyList[auth.config.vendor] = {
				vendor: auth.config.vendor,
				displayName: auth.config.displayName,
				color: auth.config.color,
				fontColor: auth.config.fontColor
			};

			JLog.info(`OAuth Strategy ${i} loaded successfully.`)
		} catch (error) {
			JLog.error(`OAuth Strategy ${i} is not loaded`)
			JLog.error(error.message)
		}
	}
	
	Server.get("/login", (req, res) => {
		if(global.isPublic){
			page(req, res, "login", { '_id': req.session.id, 'text': req.query.desc, 'loginList': strategyList});
		}else{
			let now = Date.now();
			let id = req.query.id || "ADMIN";
			let lp = {
				id: id,
				title: "LOCAL #" + id,
				birth: [ 4, 16, 0 ],
				_age: { min: 20, max: undefined }
			};
			lp.username = (lp.name || lp.title || "").toString().trim();
			MainDB.users.findOne([ '_id', id ]).limit([ 'kkutu', true ]).on(function($body){
				var savedName = getSavedNickname($body);
				var needsJoinedAt = !hasSavedJoinedAt($body);
				if(savedName) lp.title = savedName;
				MainDB.session.upsert([ '_id', req.session.id ]).set([ 'profile', lp ], [ 'createdAt', now ]).on(function($res){
					if(savedName){
						MainDB.users.update([ '_id', id ]).set(
							[ 'lastLogin', now ],
							[ 'kkutu.username', lp.username ],
							needsJoinedAt ? [ 'kkutu.joinedAt', DEFAULT_JOINED_AT ] : undefined
						).on();
					}else{
						MainDB.users.update([ '_id', id ]).set(
							[ 'lastLogin', now ],
							[ 'kkutu.name', lp.title || lp.name ],
							[ 'kkutu.username', lp.username ],
							needsJoinedAt ? [ 'kkutu.joinedAt', DEFAULT_JOINED_AT ] : undefined
						).on();
					}
					req.session.admin = true;
					req.session.profile = lp;
					res.redirect("/");
				});
			});
		}
	});

	Server.get("/logout", (req, res) => {
		MainDB.session.remove([ '_id', req.session.id ]).on(function(){
			req.session.destroy(function(err){
				if(err) return res.sendStatus(500);
				res.redirect('/');
			});
		}, null, function(){ res.sendStatus(500); });
	});

	Server.get("/loginfail", (req, res) => {
		page(req, res, "loginfail");
	});
}
