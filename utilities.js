"use strict";

var jsonByName=function(list, name){
  return list.filter(function(d){return d.name==name;})[0];
};

var jsonById=function(list, id){
  return list.filter(function(d){return d.id==id;})[0];
};

var color = d3.scale.category20();

var colorArray=[];
for(var i=0; i<20; i++)colorArray.push(color(i));
// for(var i=0; i<20; i++)colorArray.push(color(i));
// for(var i=0; i<20; i++)colorArray.push(color(i));

var frac20 = function(d){
	var n=20;
	return d- Math.floor(d/n) * n;
};

var tooltipAdjust=function(pos){
  return [pos[0]+10, pos[1]-30];
};

var setcursor=function(cursor)
{
  d3.select("body").style("cursor", cursor);
};

var tooltip = d3.select("body")
  .append("div")
  .attr("class", "tooltip")
  .text("a simple tooltip");

// Object.prototype.getKey = function(value){
//   for(var key in this){
//     if(this[key] == value){
//       return key;
//     }
//   }
//   return null;
// };




Array.prototype.clear = function() {
    this.splice(0, this.length);
};

Array.prototype.remByVal = function(val) {
    for (var i = 0; i < this.length; i++) {
        if (this[i] === val) {
            this.splice(i, 1);
            i--;
        }
    }
    return this;
};

Array.prototype.hasKey = function(key) {
    for (var i = 0; i < this.length; i++) {
        if (this[i].key === key) {
            return true;
        }
    }
    return false;
};
Array.prototype.byKey = function(key) {
    for (var i = 0; i < this.length; i++) {
        if (this[i].key === key) {
            return this[i];
        }
    }
    return null;
};
Array.prototype.byKeyVal = function(key, val) {
    for (var i = 0; i < this.length; i++) {
        if (this[i][key] === val) {
            return this[i];
        }
    }
    return null;
};

Array.prototype.remByKey = function(key) {
    for (var i = 0; i < this.length; i++) {
        if (this[i].key === key) {
            this.splice(i, 1);
            i--;
        }
    }
    return this;
};

Array.prototype.indexByKeyVal=function(key, val) {
    for (var i = 0; i < this.length; i++) {
        if (this[i][key] == val) {
            return i;
        }
    }
    return -1;
};


