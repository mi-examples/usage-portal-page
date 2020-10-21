"use strict";
// User <=> Element graph
// Either a user or an element be in the center. the opposite data type spread out in sphere

var globalStates={
    topLabelOn: true,
    bottomLabelOn: false,
    bIsIPad: false
};


var angleFactor = 60;

var map=function(valIn, inMin, inMax, outMin, outMax){
    if(valIn < inMin) return outMin;
    if(valIn > inMax) return outMax;
    return (valIn-inMin) * (outMax - outMin)/(inMax - inMin) + outMin;
};

var labelPosRadial = function(d, cx, cy){
    return "translate("+(cx+d.x)+","+(cy+d.y)+")rotate("+(d.angle*angleFactor)+")translate("+(-d.x-60)+","+(-d.y+25)+")"
};

var labelSize = 200; //in characters
var characterWidth = 6;
var labelShiftBase = 20;
var maxDays = 60;

var totalDataDays = 180;

var labelPosNormal = function(d, cx, cy){
    // debugger
    var size = Math.min(d.name.length, labelSize);
    var t = 0;
    if($('.dLabelDiv[data-index="'+d.index+'"]').length){
        var t = $('.dLabelDiv[data-index="'+d.index+'"]').width();
    }
    // console.log(labelSize);
    if(d.angle > Math.PI/2 && d.angle < Math.PI *3 /2){
        var x = t ? cx - t - 30 : (cx-(size*characterWidth+labelShiftBase));
        return "translate("+x+","+(cy-12)+")"
    }else{
        return "translate("+(cx + 15)+","+(cy-12)+")"
    }
};

var labelPos = labelPosNormal;
// var labelPos = labelPosRadial;

var userElementGraph = ((function(){
    var _scaleType = "Linear";
    var _data;
    var _name;
    var _centerType;
    var _graphData=null;

    var bPlayingBack = false;

    var _graph={edges:[], nodes:[]};


    var popupK = 1.5;


    var width = 640 * popupK,
        height = 450 * popupK,
        xpadding_left = 0,
        xpadding_right = 30,
        ypadding = 0,
        r = 140 * popupK;

    var centerX = width/2.0 + xpadding_left;
    var centerY = height/2.0 + ypadding;

    var graphSvg = d3.select("#graph").append("svg")
        .attr("width", width)
        .attr("height", height);

    var gridLineSvg = graphSvg.append("g");
    var gridSvg = graphSvg.append("g");
    var edgeSvg = graphSvg.append("g");
    var labelSvg = graphSvg.append("g");
    var nodeSvg = graphSvg.append("g");
    window.nodeSvg = nodeSvg;
    var plotData=null;
    var _pDate = null;

    var labelImportanceThreshold = -1;

    var bShowAllLabels=function(){
        return _graph.nodes.length < 20;
    };

    var setGraphFromData=function(centerType, data, name){ //data is userAccess
        // _pDate = pDate;
        _pDate = allDates[totalDataDays - maxDays + DayElapsed];
        _data = data;
        _name = name;
        _centerType = centerType;

        // cache the old graph so we can compare
        _graph._nodes = _graph.nodes;
        _graph.edges = _graph.edges;

        _graph.nodes=[];
        _graph.edges=[];

        //make root note
        var id=0;


        var orgData = centerType=="User" ? UsersByName[name] : ElementsByName[name];
        // orgData.name = '';
        var org_node={
            index: id,
            name:'',
            data: orgData,
            type: centerType
        };
        _graph.nodes.push(org_node);

        var pairs, node, edge;
        // in case of User:
        // 1. create nodes for all elements
        // 2. assign days_since_last_view to be infinite

        // Elements.forEach(function(ele){

        if(centerType == "Element"){
            // find all users have accessed the element
            var allAccessedUsers = _.unique(data
                .filter(function(d){return d.name == name;})
                .map(function(d){return d.display_name;}));

            $('#dTotalConnectedElement').show();
            $('#dTotalConnectedUser').hide();
            $('#dElementLegend').hide();
            $('#dUserLegend').show();


            $('.dTotalConnected').text(allAccessedUsers.length + ' User' + (allAccessedUsers.length > 1 ? 's' : ''));
            // create node for each user
            id = 1;
            allAccessedUsers.forEach(function(ele){
                node = {
                    index: id,
                    name: ele,
                    view_count: 0,
                    days_since_last_view: 1000,
                    data:null,
                    type:'User'
                }
                id++;
                _graph.nodes.push(node);
                _graph.edges.push({source: node, target: org_node});
            });

            // find all the access record matchs the element
            pairs = data
                .filter(function(d){return d.name == name && +d.date == +_pDate;});
            window.pairs = pairs;

            // set parameters for the nodes (users) accordingly
            pairs.forEach(function(d){
                var idx = _graph.nodes.indexByKeyVal('name', d.display_name);
                node = _graph.nodes[idx];
                node.view_count = d.view_count;
                node.days_since_last_view = d.days_since_last_view;
                node.data = Users.byKeyVal("name", d.display_name);
                node.type = "User";
            });
        }else if(centerType == "User"){
            // get all the elements user has accessed
            var allAccessedElements = _.unique(data
                .filter(function(d){return d.display_name == name;})
                .map(function(d){return d.name;}));

            $('#dTotalConnectedElement').hide();
            $('#dTotalConnectedUser').show();
            $('#dElementLegend').show();
            $('#dUserLegend').hide();

            $('.dTotalConnected').text(allAccessedElements.length + ' Tile' + (allAccessedElements.length > 1 ? 's' : '') );
            // for each element, create a node
            id=1;
            allAccessedElements.forEach(function(ele){
                node = {
                    index:id,
                    name: ele,
                    view_count: 0,
                    days_since_last_view: 1000,
                    data:null,
                    type:'Element'
                };
                id++;
                _graph.nodes.push(node);
                _graph.edges.push({source: node, target: org_node});
            });

            // find all the record matches the user
            pairs = data
                .filter(function(d){return d.display_name == name && +d.date == +_pDate;});

            window.pairs = pairs;
            pairs.forEach(function(d){
                var idx = _graph.nodes.indexByKeyVal('name', d.name);
                node = _graph.nodes[idx];
                node.view_count = d.view_count;
                node.days_since_last_view = d.days_since_last_view;
                node.data = Elements.byKeyVal("name", d.name);
                node.type = "Element";
            });
        }

        _graph.nodes.forEach(function(node){
            node.labelImportance = node.view_count / (node.days_since_last_view+1);
            if(node.days_since_last_view > 90) node.labelImportance = 0;
        })
        _graph.nodes[0].labelImportance = 100; //center node always visible

        var importance = _.pluck(_graph.nodes, 'labelImportance').sort(function(a,b){return b-a;});

        if(importance.length > 15){
            labelImportanceThreshold = importance[14];
        }else{
            labelImportanceThreshold = -1;
        }
    };

    // var rScale =d3.scale.linear().domain([1, 50]).range([1, 10]);
    var nodeRScale = d3.scale.log().domain([1, 1000]).range([1 * popupK, 10 * popupK]);
    var rScaleLinear = d3.scale.linear().domain([1, 100]).range([40* popupK, 200* popupK]);
    var rScaleLog = d3.scale.log().domain([1, 100]).range([40* popupK, 200* popupK]);
    var rScale = function(){
        if(_scaleType == "Linear"){
            return rScaleLinear;
        }else if(_scaleType == "Log"){
            return rScaleLog;
        }
    }
    // window.rScale = rScale;

    var doStarLayout=function(){
        var numEdges = _graph.edges.length;
        _graph.nodes[0].angle = 0;
        _graph.nodes[0].r = 0;
        for(var i=1; i<=numEdges; i++){
            // add starting angle offset to make label more visible, less cluttered
            var angle = Math.PI * 2.0 / numEdges * (i-1) + 0.2;
            // var r1= r / rScale()(_graph.nodes[i].view_count);
            var r1= rScale()(_graph.nodes[i].days_since_last_view);
            _graph.nodes[i].angle = angle;
            _graph.nodes[i].r = r1;
            _graph.nodes[i].x = r1 * Math.cos(angle);
            _graph.nodes[i].y = r1 * Math.sin(angle);
        }
    };

// Draw the nodes and links of the chart
    var getRadius = function(d){
        var centerNodeR = 8;
        if(d.data != null && d.days_since_last_view < 90){
            var r = (nodeRScale(d.view_count) + 5);
            return r ? r : 3;
        }
        else{
            return centerNodeR;
        }
    }

    var drawLinks = function(){
        var link = edgeSvg.selectAll(".link")
            .data(_graph.edges);

        link.enter().append("line")
            .attr("x1", function(d){return d.source.x;})
            .attr("y1", function(d){return d.source.y;})
            .attr("x2", function(d){return d.target.x;})
            .attr("y2", function(d){return d.target.y;})
            .attr("stroke", function(d){return color(frac20(d.source.index));})
            .attr("class", "link")
            .style("stroke-width", function(d) { return d.source.days_since_last_view < 90 ?  1 : 0; })
            .style("opacity", function(d){
                return map(d.source.days_since_last_view, 0, 70, 1, 0);
            })
            .attr("transform", "translate("+centerX+","+centerY+")");

        link.transition()
            .duration(1000)
            .ease("linear")
            .attr("x1", function(d){return d.source.x;})
            .attr("y1", function(d){return d.source.y;})
            .attr("x2", function(d){return d.target.x;})
            .attr("y2", function(d){return d.target.y;})
            .attr("class", "link")
            .attr("stroke", function(d){return color(frac20(d.source.index));})
            .style("stroke-width", function(d) { return d.source.days_since_last_view < 90 ?  1 : 0; })
            .style("opacity", function(d){
                return map(d.source.days_since_last_view, 0, 70, 1, 0);
            })
            .attr("transform", "translate("+centerX+","+centerY+")");

        link.exit()
            .remove();  };

    var drawNodes = function(){
        var node = nodeSvg.selectAll(".node")
            .data(_graph.nodes);

        var tooltipContents=function(d){
            var str=d.name;

            if(str.length){
                str = '<strong>' + str +'</strong><br />';
                if(d.type=="User"){
                    str += "Prior 180 day view count: <strong>" +  parseInt(d.view_count) + '</strong>';
                    str += "<br />Days Since Last View: <strong>" + parseInt(d.days_since_last_view) + '</strong>';
                }else{
                    str += "Prior 180 day view count: <strong>" +  parseInt(d.view_count) + '</strong>';
                    str += "<br />Days Since Last View: <strong>" + parseInt(d.days_since_last_view) + '</strong>';
                }
            }
            return str;
        };


        var fillColor = function(d){
            if(d.data == null){
                return colorArray[5];
            }else if(d.index == 0) {
                return "#333"; //mark root node dark
            }else{
                // console.log(d.data.group);
                return colorArray[frac20(d.data.group)];
            }
        }
        // var rScale = d3.scale.log().domain([1, 1000]).range([2, 10]);
        var centerNodeR = 3;
        node.enter().append("circle")
            .attr("class", "node")
            .attr("r", function(d){return getRadius(d);})
            .attr("cx", function(d){return d.x;})
            .attr("cy", function(d){return d.y;})
            .style("opacity", function(d){
                return d.days_since_last_view ? map(d.days_since_last_view, 0, 90, 1, 0) : 1;
            })
            .style("fill", function(d) {
                return fillColor(d);
                // return color(frac20(d.index));
            })
            .attr("transform", "translate("+centerX+","+centerY+")")
            .on("mouseover", function(d){
                d3.select(this).transition()
                    .duration(400)
                    .attr("r", function(d){
                        return getRadius(d) * 2;
                    });

                var content = tooltipContents(d);
                if(content){
                    tooltip
                        .html(content)
                        .style("visibility", "visible");
                }
                $('#graph').parent().append($('.tooltip'));
            })
            .on("mousemove", function(d){
                if (d.days_since_last_view >= 90) return;

                var pos = tooltipAdjust(d3.mouse(this));
                // console.log(pos);
                // return tooltip.style("top", (event.y-40)+"px").style("left",(event.x)+"px");
                return tooltip.style("top", pos[1] + centerY + 30 + "px").style("left", pos[0] + centerX + 15 + "px");
            })
            .on("mouseout", function(d){
                d3.select(this).transition()
                    .duration(400)
                    .attr("r", function(d){return getRadius(d);});
                tooltip.style("visibility", "hidden");
            })
            .on("click", function(d){
                var mask = new Ext.DevxBodyMask({msg:"Loading ..."});
                mask.show();
                if(d.type == 'User'){
                    window.location = globalConstants.homeSite + 'admin/user/edit/id/' + d.data.id;
                }else{
                    window.location = globalConstants.homeSite + d.data.id;
                }
                // setDayElapsed(0);
                // centerType = d.type;
                // $('#center-object').text(d.type);
                // setGraphFromData(d.type, userAccess, d.name);
                // initSelectbox();
                // doStarLayout();
                // renderGraph();
            });

        node.transition()
            .duration(1000)
            .ease("linear")
            .attr("class", "node")
            .attr("r", function(d){
                return getRadius(d);
            })
            .attr("cx", function(d){return d.x;})
            .attr("cy", function(d){return d.y;})
            .style("opacity", function(d){
                return d.days_since_last_view ? map(d.days_since_last_view, 0, 90, 1, 0) : 1;
            })
            .style("fill", function(d) {
                return fillColor(d);
                // return color(frac20(d.index));
            })
            .attr("transform", "translate("+centerX+","+centerY+")");

        node.exit().remove();
    };

    var drawLabels = function(){

        var wrapText = function(text, index){
            if(text.length == 0){
                return text;
            }
            return '<body xmlns="http://www.w3.org/1999/xhtml"><div class="dLabelDiv" data-index="' + index + '" style="display:inline-block; background-color: #fff; padding: 2px; font-size: 12px; border: 1px solid rgba(214,214,214,0.50); color:#222">' + text + '</div></body>';
        }

        var label = nodeSvg.selectAll(".label")
            .data(_graph.nodes);

        label.enter()
            .append("foreignObject")
            .attr("class", "label")
            .attr("x", function(d){return d.x;})
            .attr("y", function(d){return d.y;})
            .attr("width", function(){return '0px'})
            .attr("height", function(){return '30px'})
            .style("opacity", function(d){
                return map(d.days_since_last_view, 0, 90, 1, 0);
            })
            .style("overflow", function(){
                return 'visible';
            })
            .attr("transform", function(d) {
                return labelPos(d, centerX, centerY);
                // return "translate("+centerX+","+centerY+")rotate("+(d.angle*angleFactor)+")"
            });
        // .call(wrap, 20);
        
        label.html(function(d){
            return wrapText(d.name, d.index);
        });

        label.transition()
            .duration(1000)
            .ease("linear")
            //  .attr("class", "label")
            .attr("x", function(d){return d.x;})
            .attr("y", function(d){return d.y;})
            .style("opacity", function(d){
                return map(d.days_since_last_view, 0, 90, 1, 0);
            })
            .style("visibility", function(d){

                if(isNaN(d.labelImportance)){
                    d.labelImportance = 1;
                    d.view_count = 1;
                }
                if(d.labelImportance >= labelImportanceThreshold) d.show_label = 1;

                if(!bShowAllLabels()) d.show_label = 0;
                if(d.show_label>0){
                    // if(d.name.length > labelSize){
                    //   var labelText = d.name.slice(0, labelSize);
                    //   labelText += "<br />";
                    //   labelText += d.name.slice(labelSize, 100);
                    //   return labelText;
                    //   // return d.name.slice(0, labelSize);
                    // }else
                    return 'visible'
                }else{
                    return 'hidden';
                }

            })
            .attr("transform", function(d){
                return labelPos(d, centerX, centerY);
                // return "translate("+centerX+","+centerY+")rotate("+(d.angle*angleFactor)+")"
            })
        // .text(function(d, idx){
        //     // it's a hack right now in order to show label when a node flies in,
        //     // and then keep it showing for a few seconds.
        //     // first initialize show_label if it hasn't
        //     // To implement it properly, we will need to reconstruct playback
        //
        //     // if(_graph._nodes.length>0 && _graph._nodes[idx]!= undefined)
        //     //   d.show_label = _graph._nodes[idx].show_label - 1;
        //     // else
        //     //   d.show_label = -1;
        //
        //     // if((_graph._nodes.length>0) && (d.r < _graph._nodes[idx].r)){
        //     //   d.show_label = 3;
        //     // };
        //
        //     if(isNaN(d.labelImportance)){
        //         d.labelImportance = 1;
        //         d.view_count = 1;
        //     }
        //     if(d.labelImportance >= labelImportanceThreshold) d.show_label = 1;
        //
        //     if(!bShowAllLabels()) d.show_label = 0;
        //     if(d.show_label>0){
        //         // if(d.name.length > labelSize){
        //         //   var labelText = d.name.slice(0, labelSize);
        //         //   labelText += "<br />";
        //         //   labelText += d.name.slice(labelSize, 100);
        //         //   return labelText;
        //         //   // return d.name.slice(0, labelSize);
        //         // }else
        //         return wrapText(d.name);
        //     }else{
        //         return "";
        //     }
        // })
        //.html(function(d){return wrapText(d.name)});
        // .text(function(d){if(globalStates.bottomLabelOn && d.r<100){
        //     return d.name.slice(0, labelSize);
        //   }else{
        //     return "";
        //   }
        // })

        // .call(doWrap);

        // add_bounding_box(label, 5);
        label.exit().remove();

    };

    var drawGrid=function(){
        // debugger;
        gridSvg = gridSvg
            .attr("class", "x grid");
        window.gridSvg = gridSvg;

        gridLineSvg = gridSvg
            .attr("class", "x grid");

        updateGrid();
    };

    var updateGrid=function(){
        // var data = rScale.ticks(3);
        var data = [1, 30, 60, 90];
        var grids = gridSvg.selectAll("circle")
            .data(data);

        grids
            .enter()
            .append("circle")
            .attr("r", function(d){return rScale()(d);})
            .style("opacity", function(d){
                return map(d, 0, 90, 1.2, 0.3);
            })
            .attr("transform", "translate("+ centerX +", "+ centerY + ")");

        grids
            .transition()
            .ease("linear")
            .duration(1000)
            .attr("r", function(d){return rScale()(d);})
            .style("opacity", function(d){
                return map(d, 0, 90, 1.2, 0.3);
            })
            .attr("transform", "translate("+ centerX +", "+ centerY + ")");


        grids
            .exit().remove();


        var gridTexts = gridLineSvg.selectAll("text").data(data);
        gridTexts.enter().append("text")
            .text(function(d){return ""+d+" day" + (d > 1 ? 's' : '');})
            .style("opacity", function(d){
                return map(d, 0, 90, 1, 0.3);
            })
            .style("font-weight", function(){ return "bold";})
            .style("font-size", function(){ return "16px";})
            .style("z-index", function(){ return "100";})
            .attr("fill", "black")
            .attr("transform", "translate("+ centerX +", "+ centerY + ")");

        gridTexts.transition().duration(1000)
            .ease("linear")
            .attr("x", function(d){return rScale()(d) + 3;})
            .attr("y", 0)
            .attr("transform", "translate("+ centerX +", "+ centerY + ")");
    };


    var renderGraph=function(){
        drawLinks();
        drawNodes();
        drawLabels();
        drawGrid();
    };

    //call when new data loaded
    var setAndRenderGraph=function(type, name){
        setDayElapsed(0);
        setGraphFromData(type, userAccess, name, firstDay);
        doStarLayout();
        renderGraph();
    };

    var renderCurrentDayGraph=function(){
        setGraphFromData(_centerType, _data, _name);
        render();
    };

    var render=function(){
        // setGraphFromData("Object", _resources.userAccess.data, Elements[0].name);
        // setGraphFromData("User", userAccess, Users[0].name);
        doStarLayout();
        renderGraph();
    };

    var scaleType=function(_){
        if(_==null){
            return _scaleType;
        }else{
            _scaleType = _;
        }
    };

    var togglePlayBack = function(){
        if(bPlayingBack){
            stopPlayBack();
        }else{
            startPlayBack();
        }
    };
    var startPlayBack = function(){

        if(DayElapsed == maxDays){
            DayElapsed = 0;
            setDayElapsed(DayElapsed);
        }

        bPlayingBack = true;
        $('#dPlayButton').html('<i class="fa fa-pause-circle"></i>Pause')
        playback();
    };

    var stopPlayBack = function(){
        bPlayingBack = false;
        $('#dPlayButton').html('<i class="fa fa-play-circle"></i>Play')
    };

    var setMaxDays = function(days){
        maxDays = days;
    };

    var playback = function(){
        if(!bPlayingBack){
            return;
        }

        renderCurrentDayGraph();

        if(DayElapsed<maxDays - 1){
            DayElapsed ++;
            setDayElapsed(DayElapsed);
            setTimeout(function(){playback()}, 500);
        }else{
            DayElapsed = maxDays;
            setDayElapsed(DayElapsed);
            stopPlayBack();
        }
    };

    return{
        height   :  height,
        width    :  width,
        xpadding_left :  xpadding_left,
        xpadding_right :  xpadding_right,
        ypadding :  ypadding,
        _graph   :  _graph,
        setGraphFromData :  setGraphFromData,
        renderCurrentDayGraph: renderCurrentDayGraph,
        doStarLayout:   doStarLayout,
        setAndRenderGraph : setAndRenderGraph,
        renderGraph : renderGraph,
        scaleType : scaleType,
        render   :   render,
        startPlayBack : startPlayBack,
        stopPlayBack : stopPlayBack,
        setDayElapsed : setDayElapsed,
        setMaxDays : setMaxDays,
        togglePlayBack : togglePlayBack
    };
})());

function doWrap(){
    nodeSvg.selectAll('.label').call(wrap, 200);
}

function wrap(selections, width) {
    selections.each(function() {
        var text = d3.select(this);
        var words = text.text().split(/\s+/).reverse();
        var word;
        var line = [];
        var lineNumber = 0,
            lineHeight = 1.1, // ems
            y = text.attr("y"),
            dy = 0.6;
        // dy = parseFloat(text.attr("dy")),
        var tspan = text.text(null).append("tspan").attr("x", 0).attr("y", y).attr("dy", dy + "em");
        while (word = words.pop()) {
            line.push(word);
            tspan.text(line.join(" "));
            if (tspan.node().getComputedTextLength() > width) {
                line.pop();
                tspan.text(line.join(" "));
                line = [word];
                tspan = text.append("tspan").attr("x", 0).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
            }
        }
    });
}

// nodeSvg.selectAll('.label').call(wrap, 200);

