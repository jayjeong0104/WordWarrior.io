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

exports.all = function(tails){
	var R = new exports.Tail([]);
	var indexes = Object.keys(tails).filter(function(index){ return tails[index]; });
	var left = indexes.length;
	var i;
	
	if(left == 0) R.go(tails.length ? R.returns : true);
	else indexes.forEach(function(index){ tails[index].then(onEnded, Number(index)); });
	function onEnded(data, __i){
		R.returns[__i] = data;
		if(--left == 0) R.go(R.returns);
	}
	
	return R;
};

exports.Tail = function(res){
	var callbacks = [], value, settled = false;
	
	this.returns = res;
	this.go = function(data){
		if(settled) return;
		settled = true;
		value = data;
		var pending = callbacks;
		callbacks = [];
		pending.forEach(function(item){ item.cb(value, item.index); });
	};
	this.then = function(cb, __i){
		if(settled) cb(value, __i);
		else callbacks.push({ cb: cb, index: __i });
	};
}
