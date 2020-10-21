"use strict";
// *** //
function parseQueryString(query) {
    var pars = (query != null ? query.substring(1) : "").replace(/&+/g, "&").split('&'), par, key, val, re = /^([\w]+)\[(.*)\]/i, ra, ks, ki, i = 0, params = {};
    while ((par = pars.shift()) && (par = par.split('=', 2))) {
        key = decodeURIComponent(par[0]).toLowerCase();
        val = decodeURIComponent(par[1] || "").replace(/\+/g, " ").toLowerCase();
        if (ra = re.exec(key)) {
            ks = ra[1];
            if (!(ks in params)) {
                params[ks] = {};
            }
            ki = (ra[2] != "") ? ra[2] : i++;
            params[ks][ki] = val;
            continue;
        }
        params[key] = val;
    }
    return params;
}

var centerType = 'Element';

var datasetResources = {
    userAccess: {
        sourceDataset : 'usage-page-history',
        data: []
    },
    userList: {
        sourceDataset : 'usage-page-users',
        data: []
    },
    elementList: {
        sourceDataset : 'usage-page-elements',
        data: []
    }
};

var singleSource = {
    sourceDataset: visualizationDatasetId,
    data: [],

    filters: {
        dataSource: {
            elementId: 'dSourceFilter',
            name: 'usage_source',
            data: [],
            selected: null
        }
    },

    setFilter: function(name, value){
        if(value == ''){
            value = null;
        }
        this.filters[name].selected = value;
        this.applyFilter();
        processResource();
        changeVisualizationType('User');
        // userElementGraph.render();
    },

    renderFilters: function(){
        var self = this;
        for(var i in this.filters){
            if(!this.filters.hasOwnProperty(i)){
                continue;
            }
            var filter = this.filters[i];

            var el = $('#'+filter.elementId);
            el.html("<option selected='selected' value=''>All</option>");
            filter.data.forEach(function(filterValue){
                el.append('<option value="'+filterValue+'">'+filterValue+'</option>');
            });

            el.unbind('change').bind('change', function(){
                self.setFilter(i, $(this).val())
            });

        };
    },

    applyFilter: function(){
        var self = this;
        datasetResources.userList.data = [];
        datasetResources.elementList.data = [];
        datasetResources.userAccess.data = [];

        var uniqueUsers = [];
        var uniqueElements = [];

        this.data.forEach(function(row){

            //Apply filters
            for(var i in self.filters) {
                if (!self.filters.hasOwnProperty(i)) {
                    continue;
                }
                var filter = self.filters[i];
                if(filter.selected == null){
                    continue;
                }

                if(row[filter.name] != filter.selected){
                    // skip forEach iteration
                    return;
                }

            }

            // Map user data
            var userId = self.mapField('user', 'user_id', row);
            if(uniqueUsers.indexOf(userId) == -1){
                uniqueUsers.push(userId);
                datasetResources.userList.data.push(self.buildRow('user', row));
            }

            // Map elements data
            var elementId = self.mapField('element', 'element_id', row);
            if(uniqueElements.indexOf(elementId) == -1){
                uniqueElements.push(elementId);
                datasetResources.elementList.data.push(self.buildRow('element', row));
            }

            // Map Access
            datasetResources.userAccess.data.push(self.buildRow('access', row));
        });
    },


    buildResources: function(data){
        this.data = data;
        var self = this;

        this.data.forEach(function(row){
            // Add filters
            for(var i in self.filters){
                if(!self.filters.hasOwnProperty(i)){
                    continue;
                }
                var filter = self.filters[i];
                var filterValue = row[filter.name];
                if(filter.data.indexOf(filterValue) == -1) {
                    filter.data.push(filterValue);
                }
            };
        });
        this.renderFilters();
        this.applyFilter();
    },

    mapField: function(type, field, row){
        var r = this.format[type][field];
        if(typeof(r) == 'function'){
            return r(row);
        }
        return row[r];
    },

    buildRow: function(type, row){
        var result = {};
        for(var i in this.format[type]) {
            if (!this.format[type].hasOwnProperty(i)) {
                continue;
            }
            result[i] = this.mapField(type, i, row);
        }
        return result;

    },


    format: {
        user: {
            user_id: 'user_id',
            display_name: 'username',
            group: 'user_group',
            group_name: 'user_group'
        },
        element: {
            element_id: 'object_id',
            name: 'object_name',
            category_id: "folder",
            category_name: "folder"
        },
        access:{
            calendar_date: 'usage_date',
            days_since_last_view: function(){
                return 0;
            },
            display_name: 'username',
            element_id: 'object_id',
            name: 'object_name',
            now_date: 'now_date',
            type: function(){
                return '';
            },
            user_id: 'user_id',
            view_count: 'view_count'
        }
    }
};

var Elements = null;
var Users = null;
var UsersById, UsersByName, ElementsById, ElementsByName;
var userAccess = null;
var allDates = [], firstDay, lastDay;
var UserCorThreshold = 0.0;
var DayElapsed = 0;
var LayoutGravity = 0.4;
var UserCor = null;
var ElementCor = null;
var ElementCorThreshold = 1.9;
var LastLoginGroups = [];
var SharedMeasureIds = [];
var CategoryIds = [];
var UserGroupsIds = [];
var categoryColorMap = [];
var userGroupsColorMap = [];
var userGraph = null;
var byDateGrouping = {};

var getNewDate = function(date){
    // return new Date(date);
    return moment(date)._d;
}

var processResource = function() {


    allDates = [];
    firstDay = null;
    lastDay = null;
    LastLoginGroups = [];
    SharedMeasureIds = [];
    CategoryIds = [];
    UserGroupsIds = [];
    categoryColorMap = [];
    userGroupsColorMap = [];
    userGraph = null;
    byDateGrouping = {};


    Elements = datasetResources.elementList.data.map(function(d) {
        return {
            id: parseInt(d.element_id),
            name: d.segment ? (d.name + " (dimensioned by " + d.segment + ")") : d.name,
            sharedMeasureId: d.shared_measure_id,
            categoryId: d.category_id,
            categoryName: d.category_name,
            group: null,
            table_view_count: d.view_count,
            users: []
        };
    }).sort(function(a, b) {
        return a.id > b.id ? 1 : -1;
    });
    SharedMeasureIds = _.uniq(Elements.map(function(d) {
        return d.sharedMeasureId;
    })).sort();
    CategoryIds = _.uniq(Elements.map(function(d) {
        return d.categoryId;
    })).sort();
    Elements.forEach(function(d) {
        d.group = CategoryIds.indexOf(d.categoryId);
        d.total_view_count = 0;
        var amount = 1;
        if(categoryColorMap[d.group]){
            amount = categoryColorMap[d.group].amount + 1;
        }

        categoryColorMap[d.group] = {
            groupId: d.group,
            categoryId : d.categoryId,
            categoryName : d.categoryName,
            color: colorArray[frac20(d.group)],
            amount: amount
        }
    });

    categoryColorMap = categoryColorMap.sort(function(a, b){
        return b.amount - a.amount;
    }).splice(0, 9);

    var legend = '';
    categoryColorMap.forEach(function(el){
        legend += ("<div class='legend-item'><div class='legend-item-color' style='background-color:"+el.color+"'></div>"+el.categoryName+"</div>");
    });
    $('#dElementLegend').html(legend);


    // console.log(categoryColorMap);
    ElementsById = _.indexBy(Elements, 'id');
    ElementsByName = _.indexBy(Elements, 'name');
    Users = datasetResources.userList.data.map(function(d) {
        return {
            id: parseInt(d.user_id),
            name: d.display_name,
            lastLoginGroup: 1 | 0,
            lastLoginTime: d.last_login_time ? getNewDate(d.last_login_time) : null,
            group: 1,
            groupName: d.group_name,
            elements: []
        };
    }).sort(function(a, b) {
        return a.id > b.id ? 1 : -1;
    });
    var lastLoginDay = _.max(Users.map(function(u) {
        return u.lastLoginTime;
    }));
    Users.forEach(function(user) {
        var dayPassed = (lastLoginDay - user.lastLoginTime) / (1000 * 60 * 60 * 24);
        //user.lastLoginGroup = Math.floor(dayPassed / 30);


    });
    LastLoginGroups = _.unique(Users.map(function(d) {
        return d.lastLoginGroup;
    })).sort(function(a, b) {
        return a - b;
    });




    Users.forEach(function(d) {
        d.group = d.lastLoginGroup;
        d.total_view_count = 0;

        var amount = 1;
        if(userGroupsColorMap[d.lastLoginGroup]){
            amount = userGroupsColorMap[d.lastLoginGroup].amount + 1;
        }

        userGroupsColorMap[d.lastLoginGroup] = {
            groupId: d.group,
            groupName : d.groupName,
            color: colorArray[frac20(d.group)],
            amount: amount
        }
    });

    userGroupsColorMap = userGroupsColorMap.sort(function(a, b){
        return b.amount - a.amount;
    }).splice(0, 9);

    var legend = '';
    userGroupsColorMap.forEach(function(el){
        if(!el || !el.groupId){
            return;
        }
        legend += ("<div class='legend-item'><div class='legend-item-color' style='background-color:"+el.color+"'></div>"+el.groupName+"</div>");
    });
    $('#dUserLegend').html(legend);

    // console.log('last groups?');
    // console.log(LastLoginGroups);

    UsersById = _.indexBy(Users, 'id');
    UsersByName = _.indexBy(Users, 'name');



    for(var i = 180; i >= 0; i --){
        var n = getNewDate(datasetResources.userAccess.data[0].now_date);
        n.setDate(n.getDate() - i + 1);
        var index = n.format('Y-m-d 00:00:00');
        byDateGrouping[index] = [];
    }

    var previousDate = null;
    datasetResources.userAccess.data.forEach(function(d) {
        if(previousDate != null){
            var firstDay = getNewDate(previousDate);
            var lastDay = getNewDate(d.calendar_date);

            var timeDiff = (lastDay - firstDay);
            var maxDays = timeDiff / (1000 * 60 * 60 * 24);

            for(var i = 0; i < maxDays; i++){
                var n = getNewDate(previousDate);
                n.setDate(n.getDate() + 1 + i);
                var index = n.format('Y-m-d 00:00:00');
                if(!byDateGrouping[index]) {
                    byDateGrouping[index] = [];
                }
            }
        }

        if(!byDateGrouping[d.calendar_date]){
            byDateGrouping[d.calendar_date] = [];
        }

        var el = Elements.byKeyVal('id', parseInt(d.element_id));
        var user = Users.byKeyVal('id', parseInt(d.user_id));

        var obj = {
            user_id: parseInt(d.user_id),
            element_id: parseInt(d.element_id),
            type: d.type,
            view_count: parseInt(d.view_count),
            name: typeof(el) == 'object' && el != null ? el.name : '',
            display_name: typeof(user) == 'object' && user != null ? user.name : '',
            days_since_last_view: parseInt(0),
            calendar_date: d.calendar_date,
            date: getNewDate(d.calendar_date)
        };

        byDateGrouping[d.calendar_date].push(obj);
        previousDate = d.calendar_date;
        return obj;
    });


    var toAdd = {};
    userAccess = [];

    for(var date in byDateGrouping){
        if(!byDateGrouping.hasOwnProperty(date)){
            continue;
        }
        var dayData = byDateGrouping[date];

        for(var add in toAdd){
            if(!toAdd.hasOwnProperty(add)){
                continue;
            }
            var present = dayData.find(function(row){
                return row.user_id + '_' + row.element_id == add;
            });

            if(!present){
                var d = toAdd[add];
                var timeDiff = (getNewDate(date) - d.date);

                var additionalDays = timeDiff / (1000 * 60 * 60 * 24);
                if(additionalDays < 0){
                    // console.log(additionalDays);
                    continue;
                }



                var el = Elements.byKeyVal('id', parseInt(d.element_id));
                var user = Users.byKeyVal('id', parseInt(d.user_id));


                dayData.push({
                    user_id: parseInt(d.user_id),
                    element_id: parseInt(d.element_id),
                    type: d.type,
                    view_count: parseInt(d.view_count),
                    name: typeof(el) == 'object' && el != null ? el.name : '',
                    display_name: typeof(user) == 'object' && user != null ? user.name : '',
                    days_since_last_view: additionalDays,
                    calendar_date: date,
                    date: getNewDate(date),
                    inserted: true
                });
            }else{
                present.days_since_last_view ++ ;
            }
        }

        dayData.forEach(function(row, index){
            if(row.inserted !== true){
                toAdd[row.user_id + '_' + row.element_id] = row;
            }
        });


    }
    var total = 0;
    for(var date in byDateGrouping){
        if(!toAdd.hasOwnProperty(add)){
            continue;
        }
        total++ ;
    }
    // console.log('total is:');
    // console.log(total);

    for(var date in byDateGrouping){
        if(!byDateGrouping.hasOwnProperty(date)){
            continue;
        }
        userAccess = userAccess.concat(byDateGrouping[date]);
        allDates.push(date);
    }

    // allDates = _.unique(userAccess.map(function(d) {
    //     return d.calendar_date;
    // })).map(function(d) {
    //     return new Date(d);
    // }).sort(function(a, b) {
    //     return a - b;
    // });

    allDates = allDates.map(function(d) {
        return moment(d)._d;
        return Date.parse(d);
    }).sort(function(a, b) {
        return a - b;
    });

    var firstDay = _.first(allDates);
    var lastDay = _.last(allDates);

    var timeDiff = (lastDay - firstDay);
    var maxDays = timeDiff / (1000 * 60 * 60 * 24);
    maxDays = 60;

    // $('#slider-day-elapsed').slider("option", "max", maxDays);
    setTimeout(function(){
        userElementGraph.setMaxDays(maxDays);
    }, 1000)


    var actualUserIds = _.unique(userAccess.map(function(u) {
        return u.user_id;
    }));
    var actualElementIds = _.unique(userAccess.map(function(u) {
        return u.element_id;
    }));
    Users = Users.filter(function(user) {
        return actualUserIds.indexOf(user.id) > -1;
    });
    Elements = Elements.filter(function(elem) {
        return actualElementIds.indexOf(elem.id) > -1;
    });
    // console.log('start processing logs');
    userAccess.forEach(function(d) {
        var a = Users.byKeyVal("name", d.display_name);
        if (a != null && d.inserted !== true && d.view_count)
            a.total_view_count += parseInt(d.view_count);
        a = Elements.byKeyVal("name", d.name)
        if (a != null && d.inserted !== true && d.view_count)
            a.total_view_count += parseInt(d.view_count);
        var user = UsersById[d.user_id];
        var element = ElementsById[d.element_id];
        if (!user || !element) {
            // console.log('not find: ' + d.user_id + " or " + d.element_id);
        }
        if (typeof(user) != 'undefined' && user.elements.indexOf(d.element_id) < 0) {
            user.elements.push(d.element_id);
        }
        if (typeof(element) != 'undefined' && element.users.indexOf(d.user_id) < 0) {
            element.users.push(d.user_id);
        }
    });
    // console.log('done processing logs');
};

var changeVisualizationType = function(type){
    userElementGraph.stopPlayBack();
    if (type == 'Element') {
        centerType = 'Element';
        userElementGraph.setGraphFromData("Element", userAccess, Elements[0].name);
        var id = Elements[0].id;
    } else {
        centerType = 'User';
        userElementGraph.setGraphFromData("User", userAccess, Users[0].name);
        var id = Users[0].id;
    }

    initSelectbox();
    $('#dSelectUserForGraph').val(id).select2("val", id).change();
    userElementGraph.render();
};

var resourcesReady = function() {
    // console.log("resources all loaded");
    processResource();
    DayElapsed = 0;
    if (centerType == 'Element') {
        userElementGraph.setGraphFromData("Element", userAccess, Elements[0].name);
        initSelectbox();
        var id = Elements[0].id;
    } else {
        userElementGraph.setGraphFromData("User", userAccess, Users[0].name);
        initSelectbox();
        var id = Users[0].id;
    }
    // $('#dSelectUserForGraph').val(id).select2("val", id).change();
    // userElementGraph.render();

    if(typeof(onVisualizationReady) != 'undefined'){
        onVisualizationReady();
    }




};
var initSelectbox = function() {
    var itemList;
    if (centerType == 'Element')
        itemList = _.unique(_.map(Elements, function(e) {
            return {
                id: e.id,
                text: e.name,
                amount: e.users.length,
                table_view_count: e.table_view_count
            };
        })).sort(function(a, b){
            return b.table_view_count - a.table_view_count;
        });
    else
        itemList = _.unique(_.map(Users, function(u) {
            return {
                id: u.id,
                text: u.name,
                amount: u.elements.length
            };
        })).sort(function(a, b){
            return b.amount - a.amount;
        });


    $("#dSelectUserForGraph").select2('destroy');
    $('#dSelectUserForGraph').select2({
        data: itemList,
        dropdownCssClass: "usage-page-select-2",
    }).unbind('change').bind('change', function(){
        var value = $(this).val();
        var row = itemList.find(function(el){
            return el.id == value;
        });


        //userElementGraph.stopPlayBack();
        //userElementGraph.setDayElapsed(0);
        // console.log('callled');
        userElementGraph.setGraphFromData(centerType, userAccess, row.text);
        userElementGraph.render();
        userElementGraph.startPlayBack();

        $('.dActiveEntityName').text(row.text);
    });

    setTimeout(function(){
        // console.log('???')
        var value = $('#dSelectUserForGraph').val();
        var row = itemList.find(function(el){
            return el.id == value;
        });
        if(row){
            $('.dActiveEntityName').text(row.text);
        }

    }, 1000)


};
(function(callback) {


    var load = function(resource) {
        return $.ajax({
            type:"GET",
            url:globalConstants.homeSite+'data/page/usage-page-git/' + resource.sourceDataset,
            headers:{"Content-type": "application/json", "Accept": "application/json"},
            dataType:'json'
        });
    };

    var resourceReady = function() {
        setTimeout(function(){
            callback();
        }, 1000)
    }


    if(singleSource.sourceDataset){
        $.when(load(singleSource)).then(function(data){
            singleSource.buildResources(data.data);
            // console.log(datasetResources);
            resourceReady();
        });

        return true;
    }




    var numResource = 0;
    for (var resource in datasetResources) {
        if (datasetResources.hasOwnProperty(resource)) {
            numResource += 1;
        }
    }




    var total = 3;
    for (var resource in datasetResources) {
        (function(i){
            if (datasetResources.hasOwnProperty(i)) {
                $.when(load(datasetResources[i])).then(function(data){
                    datasetResources[i].data = data.data;
                    total -- ;
                    if(total == 0){
                        resourceReady();
                    }
                });
            }
        })(resource);
    }
}(resourcesReady));
$(function() {

    var updateDatePosition = function(ui){
        var left = parseInt($(ui.handle).css('left').split('.')[0]) + 3;
        $('.slider-day-elapsed__days, .slider-day-elapsed__full-date').each(function(){
            $(this).css('left', left + $(this).width() / 2);
        });
    };

    $('#slider-day-elapsed').slider({
        orientation: "horizontal",
        range: false,
        min: 0,
        max: 60,
        value: DayElapsed,
        step: 1,
        animate: 1000,
        slide: function(event, ui) {
            // $("#a_field").val(ui.value);
            // $("#a").text(ui.value);
            setTimeout(function(){
                // updateDatePosition(ui);
                DayElapsed = ui.value;
                updateSetDayElapsed();
                // userElementGraph.renderCurrentDayGraph();
            }, 10);
        },
        change: function(event, ui){
            // updateDatePosition(ui);
            DayElapsed = ui.value;
            updateSetDayElapsed();
            userElementGraph.renderCurrentDayGraph();
        },
        create: function(event, ui){
            setTimeout(function() {
                $("#slider-day-elapsed .ui-slider-handle").append($('.slider-day-elapsed__days, .slider-day-elapsed__full-date'));
            },1000);
        }
    });
    $('#slider-day-elapsed').draggable();
    updateSetDayElapsed();
    // $('#slider-day-elapsed').mouseup(function() {
    //     var value = $('#slider-day-elapsed').slider('value');
    //     DayElapsed = value;
    //     updateSetDayElapsed();
    //     userElementGraph.renderCurrentDayGraph();
    // });
});
var setDayElapsed = function(d) {
    DayElapsed = d;
    updateSetDayElapsed();
    $('#slider-day-elapsed').slider('value', DayElapsed);
};

var updateSetDayElapsed = function(){
    d3.select("#day-elapsed").text(DayElapsed);
    if(datasetResources.userAccess.data[0]){
        var t = getNewDate(datasetResources.userAccess.data[0].now_date);
        t.setDate(t.getDate() - maxDays + DayElapsed);
        $('#dFullDate').text(t.format('M d, Y'));
    }
};


$('#offset-slider').mouseup(function() {
    var value = $('#offset-slider').slider('value');

    updateOffsetRangeDisplay(minv, maxv);
    OffsetRange[0] = minv;
    OffsetRange[1] = maxv;
    filterAndPlot();
});
$(function() {
    d3.selectAll("input#scale").on("change", function change() {
        userElementGraph.scaleType(this.value);
        userElementGraph.render();
    });
});
