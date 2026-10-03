"use strict";

function entry(box, key){
	return box && Object.prototype.hasOwnProperty.call(box, key) ? box[key] : undefined;
}
function quantity(box, key){
	var item = entry(box, key);
	var value = item && typeof item == "object" ? item.value : item;
	if(typeof value != "number" || !Number.isFinite(value) || !Number.isInteger(value) || value <= 0) return 0;
	if(item && typeof item == "object" && item.expire !== undefined){
		if(!Number.isFinite(item.expire) || item.expire <= Date.now() / 1000) return 0;
	}
	return value;
}
function consume(box, key, value, force){
	if(!Number.isInteger(value) || value <= 0 || quantity(box, key) < value) return false;
	var item = entry(box, key);
	if(item && typeof item == "object"){
		item.value -= value;
		if(item.value === 0 && (force || !item.expire)) delete box[key];
	}else{
		box[key] -= value;
		if(box[key] === 0) delete box[key];
	}
	return true;
}
function obtain(box, key, value, term, addValue){
	var current = entry(box, key);
	var now = Math.round(Date.now() / 1000);
	if(!Number.isInteger(value) || value <= 0) throw new Error("Invalid inventory quantity");
	if(term && Number.isFinite(term) && term > 0){
		if(current && typeof current == "object" && Number.isFinite(current.expire) && current.expire > now){
			if(addValue) current.value = Math.max(0, Number(current.value) || 0) + value;
			else current.expire += term;
		}else if(typeof current == "number" && quantity(box, key)){
			box[key] = current + value;
		}else{
			box[key] = { value: value, expire: addValue ? term : now + term };
		}
	}else{
		box[key] = quantity(box, key) + value;
	}
}

exports.entry = entry;
exports.quantity = quantity;
exports.consume = consume;
exports.obtain = obtain;

exports.snapshot = function(user, fields){
	return fields.map(function(field){
		var cursor = user;
		field.split('.').forEach(function(key){ cursor = cursor == null ? undefined : cursor[key]; });
		return [ field, cursor === undefined ? null : JSON.parse(JSON.stringify(cursor)) ];
	});
};
// Compare the fields read by this request in the same UPDATE that saves its result.
// A competing request or game flush then cannot silently overwrite its inventory.
exports.save = function(table, uid, before, changes, callback){
	var filters = [ [ '_id', uid ] ].concat(before.map(function(item){
		return [ item[0], item[0] === 'money' ? item[1] : { $jsonEquals: item[1] } ];
	}));
	var update = table.update.apply(table, filters);
	update.set.apply(update, changes).on(function(doc, err, result){
		if(err) return callback(err);
		if(!result || result.rowCount !== 1){
			var conflict = new Error("Inventory changed; retry the request");
			conflict.code = 409;
			return callback(conflict);
		}
		callback(null);
	}, null, callback);
};
