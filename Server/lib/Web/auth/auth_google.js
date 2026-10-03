const config = require('../../sub/auth.json');
const https = require('https');

module.exports.config = {
    strategy: require('passport-google-oauth2').Strategy,
    color: '#FFFFFF',
    fontColor: '#000000',
    vendor: 'google',
    displayName: 'withGoogle'
}

module.exports.strategyConfig = {
    clientID: config.google.clientID, // 보안을 위해서입니다.
    clientSecret: config.google.clientSecret, // 이 방법을 사용하는 것을
    callbackURL: config.google.callbackURL, // 적극 권장합니다.
    passReqToCallback: true,
    scope: ['openid', 'profile', 'email']
}

function normalizeGoogleImage(image){
    if(typeof image !== "string") return "";
    image = image.trim();
    if(!image) return "";
    if(image.indexOf("//") === 0) image = "https:" + image;
    if(/^http:\/\//i.test(image)) image = "https://" + image.slice(7);
    if(!/^https?:\/\//i.test(image)) return "";
    return image;
}

function extractGoogleImage(profile){
    var image = "";
    var i = 0;
    var photos = (profile && Array.isArray(profile.photos)) ? profile.photos : [];

    for(i = 0; i < photos.length; i++){
        image = normalizeGoogleImage((photos[i] && (photos[i].value || photos[i].url)) || "");
        if(image) return image;
    }
    image = normalizeGoogleImage(profile && profile.picture);
    if(image) return image;
    image = normalizeGoogleImage(profile && profile.photo);
    if(image) return image;
    image = normalizeGoogleImage(profile && profile.avatar);
    if(image) return image;

    if(profile && profile._json && typeof profile._json === "object"){
        image = normalizeGoogleImage(profile._json.picture);
        if(image) return image;
        image = normalizeGoogleImage(profile._json.avatar_url);
        if(image) return image;
        if(profile._json.image && typeof profile._json.image === "object"){
            image = normalizeGoogleImage(profile._json.image.url || profile._json.image.value);
            if(image) return image;
        }
    }
    return "";
}

function fetchGoogleUserinfoPicture(accessToken, done){
    var req;
    var completed = false;
    function finish(image){
        if(completed) return;
        completed = true;
        done(image);
    }
    if(!accessToken) return finish("");

    req = https.request("https://www.googleapis.com/oauth2/v3/userinfo", {
        method: "GET",
        timeout: 10000,
        headers: {
            "Authorization": "Bearer " + accessToken,
            "Accept": "application/json",
            "Connection": "close"
        }
    }, function(res){
        var chunks = [];
        res.on("data", function(chunk){ chunks.push(chunk); });
        res.on("end", function(){
            var payload = null;
            var image = "";
            if(!chunks.length) return finish("");
            try{
                payload = JSON.parse(Buffer.concat(chunks).toString("utf8"));
            }catch(e){
                return finish("");
            }
            image = normalizeGoogleImage(payload && (payload.picture || payload.avatar_url));
            return finish(image || "");
        });
        res.on("error", function(){ finish(""); });
    });
    req.on("timeout", function(){ req.destroy(); finish(""); });
    req.on("error", function(){ finish(""); });
    req.end();
}

module.exports.strategy = (process, MainDB, Ajae) => {
    return (req, accessToken, refreshToken, profile, done) => {
        const $p = {};
        let image = "";

        $p.authType = "google";
        $p.id = profile.id;
        $p.name = (profile.name.familyName ? profile.name.familyName + ' ' : '') + profile.name.givenName;
        $p.title = profile.nickname;
        image = extractGoogleImage(profile);

        function finishWithImage(finalImage){
            finalImage = normalizeGoogleImage(finalImage);
            if(finalImage) $p.image = finalImage;
            process(req, accessToken, MainDB, $p, done);
        }

        if(image) return finishWithImage(image);

        fetchGoogleUserinfoPicture(accessToken, function(userinfoImage){
            if(userinfoImage) return finishWithImage(userinfoImage);
            if($p.id){
                return finishWithImage("https://profiles.google.com/s2/photos/profile/" + encodeURIComponent($p.id) + "?sz=256");
            }
            return finishWithImage("");
        });
    }
}
