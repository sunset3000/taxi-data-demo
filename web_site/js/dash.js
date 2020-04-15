function init() {

    const   clientIdParamName = "cid",
            userPoolIdParamName = "upid",
            identityPoolIdParamName = "ipid",
            cognitoRegionParamName = "r";
            GroupName = "group";

    var cognitoAppClientId = getCongitoConfigParameterByName(clientIdParamName),
        cognitoUserPoolId = getCongitoConfigParameterByName(userPoolIdParamName),
        cognitoIdentityPoolId = getCongitoConfigParameterByName(identityPoolIdParamName),
        cognitoRegion = getCongitoConfigParameterByName(cognitoRegionParamName),
        cognitoUser;

    var chartTrend;
    var chartTripsPerDay;
    var chartTripsPerLocation;
    var chartAnalystTripsPerDay;
    var chartAnalystTripsPerLocation;
    var map;
    var searchCircle;
    var layer;
    var curLon = -78.0000;
    var curLat = 40.222;

    var QUERY_URI = "https://8esdojcvjk.execute-api.us-east-1.amazonaws.com/dev/athena_query";
    var NEARBY_URL = "https://rg3fl15es6.execute-api.us-east-1.amazonaws.com/dev/query";
    var defaultQuery = 'U0VMRUNUIGNhYl90eXBlLCBkYXRlLCBTVU0odHJpcHMpIEFTIHRyaXBzIEZST00gZGFpbHkgR1JPVVAgQlkgY2FiX3R5cGUsIGRhdGUgT1JERVIgQlkgY2FiX3R5cGUsIGRhdGU7';

    function template(strings, ...keys) {
        return (function(...values) {
            var dict = values[values.length - 1] || {};
            var result = [strings[0]];
            keys.forEach(function(key, i) {
                var value = Number.isInteger(key) ? values[key] : dict[key];
                result.push(value, strings[i + 1]);
            });
            return result.join('');
        });
    }

    var tplQuery = template`SELECT cab_type, date, SUM(trips) AS trips
FROM daily
WHERE date >= date('${0}') AND date < date('${1}')
GROUP BY cab_type, date
ORDER BY cab_type, date;`;

    var tplPerLocQuery = template`SELECT cab_type, date, pickup_location_id, SUM(trips) AS trips
FROM daily
WHERE date >= date('${0}') AND date < date('${1}')
GROUP BY cab_type, date, pickup_location_id
ORDER BY cab_type, date, pickup_location_id;`;

    var tpl10min = template`SELECT cab_type,
    tpep_pickup_datetime,
    SUM(trips) AS trips
FROM "10min"
WHERE tpep_pickup_datetime >= localtimestamp - interval '${0}' minute
GROUP BY  cab_type, tpep_pickup_datetime, trips
ORDER BY  cab_type, tpep_pickup_datetime, trips`;

    var jobs = [];

    $("#userPoolId").val(cognitoUserPoolId);
    $("#identityPoolId").val(cognitoIdentityPoolId);
    $("#clientId").val(cognitoAppClientId);
    $("#userPoolRegion").val(cognitoRegion);

    var perDayOptions = {
        chart: {
            type: 'spline'
        },
        title: {
            text: 'Trips Per Day'
        },
        xAxis: {
            type: 'datetime',
            labels: {
                overflow: 'justify'
            }
        },
        yAxis: {
            title: {
                text: '# of trips'
            },
            min: 0,
            minorGridLineWidth: 0,
            gridLineWidth: 0,
            alternateGridColor: null
        },
        tooltip: {
            split: true,
            xDateFormat: '%Y-%m-%d'
        },
        plotOptions: {
            spline: {
                lineWidth: 4,
                states: {
                    hover: {
                        lineWidth: 5
                    }
                },
                marker: {
                    enabled: false
                }
            }
        },
        series: [{
            name: 'yellow',
            data: [],
            id: 'yellow',
        }, {
            name: 'green',
            id: 'green',
            data: []
        }, {
            name: 'fhv',
            id: 'fhv',
            data: []
        }],
        navigation: {
            menuItemStyle: {
                fontSize: '10px'
            }
        }
    };

    var perLocationOptions = {
        chart: {
            type: 'column'
        },
        title: {
            text: 'Trips Per Location'
        },
        xAxis: {
            type: "category",
            categories: ['EWR', 'Queens', 'Bronx', 'Manhattan', 'Staten Island', 'Brooklyn']
        },
        yAxis: {
            min: 0,
            title: {
                text: '# of trips'
            },
            stackLabels: {
                enabled: true,
                style: {
                    fontWeight: 'bold',
                    color: (Highcharts.theme && Highcharts.theme.textColor) || 'gray'
                }
            }
        },
        legend: {
            align: 'right',
            x: -30,
            verticalAlign: 'top',
            y: 25,
            floating: true,
            backgroundColor: (Highcharts.theme && Highcharts.theme.background2) || 'white',
            borderColor: '#CCC',
            borderWidth: 1,
            shadow: false
        },
        tooltip: {
            split: true,
            formatter: function () {
                return '<b>' + this.x + '</b><br/>' +
                    this.series.name + ': ' + this.y + '<br/>' +
                    'Total: ' + this.point.stackTotal;
            }
        },
        plotOptions: {
            column: {
                stacking: 'normal',
                dataLabels: {
                    enabled: true,
                    color: (Highcharts.theme && Highcharts.theme.dataLabelsColor) || 'white',
                    style: {
                        textOutline: '1px 1px black'
                    }
                }
            }
        },
        series: [{
            name: 'yellow',
            data: [],
            id: 'yellow',
        }, {
            name: 'green',
            id: 'green',
            data: []
        }, {
            name: 'fhv',
            id: 'fhv',
            data: []
        }]
    };

    function getCongitoConfigParameterByName(name) {
        var data = getQSParameterByName(name);
        if(data == null || data == '') {
            data = localStorage.getItem(name);
            return data;
        }
        localStorage.setItem(name, data);
        return data;
    }

    function getQSParameterByName(name, url) {
        if (!url) {
            url = window.location.href;
        }
        name = name.replace(/[\[\]]/g, "\\$&");
        var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
            results = regex.exec(url);
        if (!results) return null;
        if (!results[2]) return '';
        return decodeURIComponent(results[2].replace(/\+/g, " "));
    }

    function identity(arg1) {
      return arg1;
    };

    function cognitoAuth() {

        $("#logoutLink").click( function() {
                stopJobs();
                cognitoUser.signOut();
                localStorage.setItem(GroupName, "");
                $("#password").val("");
                $("#loginForm").removeClass("hidden");
                $("#logoutLink").addClass("hidden");
                $("#unauthMessage").removeClass("hidden");

                $("#ops_view").addClass("hidden");
                $("#driver_view").addClass("hidden");
                $("#analyst_view").addClass("hidden");
        });
        $("#btnSaveConfiguration").click(function (e) {

        var clientId = $("#clientId").val(),
            userPoolId = $("#userPoolId").val(),
            identityPoolId = $("#identityPoolId").val(),
            userPoolRegion = $("#userPoolRegion").val();

        if(clientId && userPoolId && identityPoolId && userPoolRegion){
            $("#configErr").addClass("hidden");
            localStorage.setItem(clientIdParamName, clientId);
            localStorage.setItem(userPoolIdParamName, userPoolId);
            localStorage.setItem(identityPoolIdParamName, identityPoolId);
            localStorage.setItem(cognitoRegionParamName, userPoolRegion);
            $("#cognitoModal").modal("hide");

        }
        else {
            $("#configErr").removeClass("hidden");
        }

        });

        function refreshAuthentication(userPool, userData) {
            var cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);
            cognitoUser.authenticateUser( authDetails, {
                onSuccess: function(result) {
                    var logins = {};
                    logins["cognito-idp." + cognitoRegion + ".amazonaws.com/" + cognitoUserPoolId] = result.getIdToken().getJwtToken();
                    var params = {
                        IdentityPoolId: cognitoIdentityPoolId,
                        Logins: logins
                    };
                    updateGroup(logins["cognito-idp." + cognitoRegion + ".amazonaws.com/" + cognitoUserPoolId]);
                    AWS.config.region = cognitoRegion;
                    AWSCognito.config.region = cognitoRegion;

                    AWS.config.credentials = new AWS.CognitoIdentityCredentials(params);

                    AWS.config.credentials.get(function(refreshErr) {
                        if(refreshErr) {
                            console.error(refreshErr);
                        }
                    });

            },
            onFailure: function(err) {
                alert(err);
            }

            });
        }

        $("#btnSavePassword").click(function (e) {
            var newPassword = $("#newPassword").val();

            if(newPassword.length >= 8 && newPassword.match(/[a-z]/) && newPassword.match(/[A-Z]/) && newPassword.match(/[0-9]/) && newPassword == $("#newPassword2").val()) {
                $("#newPasswordModal").modal("hide");
                $("#newPasswordErr").addClass("hidden");
                $("#newPasswordMatchErr").addClass("hidden");
                $("#newPasswordComplexityErr").addClass("hidden");
                $("#btnLogin").trigger("click");
            } else {
              $("#newPasswordErr").removeClass("hidden");
              if(newPassword != $("#newPassword2").val()) {
                $("#newPasswordMatchErr").removeClass("hidden");
              } else {
                $("#newPasswordMatchErr").addClass("hidden");
              }
              if(newPassword.length < 8 || !newPassword.match(/[a-z]/) || !newPassword.match(/[A-Z]/) || !newPassword.match(/[0-9]/)) {
                $("#newPasswordComplexityErr").removeClass("hidden");
                if(newPassword.length < 8 ) {
                  $("#newPasswordLengthErr").removeClass("hidden");
                } else {
                  $("#newPasswordLengthErr").addClass("hidden");
                }
                if(!newPassword.match(/[a-z]/)) {
                  $("#newPasswordLowerErr").removeClass("hidden");
                } else {
                  $("#newPasswordLowerErr").addClass("hidden");
                }
                if(!newPassword.match(/[A-Z]/)) {
                  $("#newPasswordUpperErr").removeClass("hidden");
                } else {
                  $("#newPasswordUpperErr").addClass("hidden");
                }
                if(!newPassword.match(/[0-9]/)) {
                  $("#newPasswordNumberErr").removeClass("hidden");
                } else {
                  $("#newPasswordNumberErr").addClass("hidden");
                }
              } else {
                $("#newPasswordComplexityErr").addClass("hidden");
              }
            }
        });

        $("#btnLogin").click(function() {
            //validate that the Cognito configuration parameters have been set
            if(!cognitoAppClientId || !cognitoUserPoolId || !cognitoIdentityPoolId || !cognitoRegion) {

                $("#configErr").removeClass("hidden");
                $("#configureLink").trigger("click");
                return;
            }

            //update ui
            $("#loginForm").addClass("hidden");
            $("#signInSpinner").removeClass("hidden");

            var userName = $("#userName").val();
            var password = $("#password").val();
            var newPassword = $("#newPassword").val();

            var authData = {
                UserName: userName,
                Password: password
            };

            var authDetails = new AmazonCognitoIdentity.AuthenticationDetails(authData);

            var poolData = {
                UserPoolId: cognitoUserPoolId,
                ClientId: cognitoAppClientId
            };

            var userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);
            var userData = {
                Username: userName,
                Pool: userPool
            };

            cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);
            cognitoUser.authenticateUser( authDetails, {
                onSuccess: function(result) {
                    var logins = {};
                    logins["cognito-idp." + cognitoRegion + ".amazonaws.com/" + cognitoUserPoolId] = result.getIdToken().getJwtToken();
                    var params = {
                        IdentityPoolId: cognitoIdentityPoolId,
                        Logins: logins
                    };

                    updateGroup(logins["cognito-idp." + cognitoRegion + ".amazonaws.com/" + cognitoUserPoolId]);

                    AWS.config.region = cognitoRegion;
                    AWSCognito.config.region = cognitoRegion;

                    AWS.config.credentials = new AWS.CognitoIdentityCredentials(params);

                    AWS.config.credentials.get(function(refreshErr) {
                        if(refreshErr) {
                            console.error(refreshErr);
                            $("#loginForm").removeClass("hidden");
                            $("#signInSpinner").removeClass("hidden");
                        }
                        else {
                            $("#unauthMessage").addClass("hidden");
                            $("#logoutLink").removeClass("hidden");
                            showDashboard(getCongitoConfigParameterByName(GroupName));
                            $("#signInSpinner").addClass("hidden");
                            jobs.push(setInterval( function() {
                                refreshAuthentication(userPool, userData);
                            }, 3600*1000));

                        }
                    });

                },
                onFailure: function(err) {
                    $("#logoutLink").addClass("hidden");
                    $("#loginForm").removeClass("hidden");
                    $("#signInSpinner").addClass("hidden");

                    alert(err);
                },
                newPasswordRequired: function(userAttributes, requiredAttributes) {
                    // User was signed up by an admin and must provide new
                    // password and required attributes, if any, to complete
                    // authentication.
                    console.log("New Password Required");

                    var attributesData = {};
                    if (newPassword.length >= 8 && newPassword.match(/[a-z]/) && newPassword.match(/[A-Z]/) && newPassword.match(/[0-9]/) && newPassword == $("#newPassword2").val()) {
                        cognitoUser.completeNewPasswordChallenge(newPassword, attributesData, this)
                    } else {
                        $("#newPasswordModal").modal("show");
                    }
                }
            });
        });
    };

    function updateGroup(idToken) {
        var payload = idToken.split('.')[1];
        var tokenObj = JSON.parse(atob(payload));
        if(tokenObj['cognito:groups'] != undefined && tokenObj['cognito:groups'][0]) {
            group = tokenObj['cognito:groups'][0]
            localStorage.setItem(GroupName, group);
        } else {
            localStorage.setItem(GroupName, "");
        }
    }

    function showDashboard(group) {
        $("#unauthMessage").addClass("hidden");
        initCharts();
        stopJobs();
        switch(group) {
            case "analysts":
                $("#analyst_view").removeClass("hidden");
                $("#ops_view").addClass("hidden");
                $("#driver_view").addClass("hidden");
                // queryStat(defaultQuery, function(data) {
                //     chartAnalystTripsPerDay.update({
                //         series: data['perMonth']
                //     });
                //     chartAnalystTripsPerDay.update({
                //         series: data['perLocation']
                //     });
                // });
                break;
            case "operators":
                $("#ops_view").removeClass("hidden");
                $("#analyst_view").addClass("hidden");
                $("#driver_view").addClass("hidden");
                showOpsView();
                jobs.push(setInterval(function() {
                    showOpsView();
                    }, 20*1000
                ));
                break;
            case "drivers":
                $("#driver_view").removeClass("hidden");
                $("#ops_view").addClass("hidden");
                $("#analyst_view").addClass("hidden");
                showDriverView();
                jobs.push(setInterval( function() {
                    updateNearBy();
                }, 30*1000));
                break;
            default:
                console.log("Error group is invalid: " + group);
        }
    }

    function initCharts() {
        function initTripTrend() {
            chartTrend = Highcharts.chart('trend_chart', {
                chart: {
                    zoomType: 'x'
                },
                title: {
                    text: 'Real-Time Trends'
                },
                xAxis: {
                    type: 'datetime',
                    dateTimeLabelFormats: {
                        millisecond: '%H:%M:%S.%L',
                        second: '%H:%M:%S',
                        minute: '%H:%M',
                        hour: '%H:%M',
                        day: '%m-%d',
                        week: '%m-%d',
                        month: '%Y-%m',
                        year: '%Y'
                    }
                },
                tooltip: {
                    split: true,
                    dateTimeLabelFormats: {
                        millisecond: '%H:%M:%S.%L',
                        second: '%H:%M:%S',
                        minute: '%H:%M',
                        hour: '%H:%M',
                        day: '%Y-%m-%d',
                        week: '%m-%d',
                        month: '%Y-%m',
                        year: '%Y'
                    }
                },
                yAxis: {
                    title: {
                        text: '# of trips'
                    }
                },
                legend: {
                    enabled: true
                },
                plotOptions: {
                    area: {
                        stacking: 'normal',
                        // marker: {
                        //     radius: 2
                        // },
                        lineWidth: 1,
                        // states: {
                        //     hover: {
                        //         lineWidth: 1
                        //     }
                        // },
                        // threshold: null
                    }
                },
                series: [
                    {
                        type: 'area',
                        name: 'Yellow',
                        id: "yellow",
                        data: []
                    }, {
                        type: 'area',
                        name: 'Green',
                        id: "green",
                        data: []
                    }, {
                        type: 'area',
                        name: 'FHV',
                        id: "fhv",
                        data: []
                    }
                ]
            });
        };

        function initOpsTripPerDay() {
            chartTripsPerDay = Highcharts.chart('trips_per_month', perDayOptions);
        }

        function initOpsTripPerLocation() {
            chartTripsPerLocation = Highcharts.chart('tripsPerLocation', perLocationOptions);
        }

        function initAnalystTripPerDay() {
            chartAnalystTripsPerDay = Highcharts.chart('trips_per_month1', perDayOptions);
        }

        function initAnalystTripPerLocation() {
            chartAnalystTripsPerLocation = Highcharts.chart('tripsPerLocation1', perLocationOptions);
        }

        initTripTrend();
        initAnalystTripPerDay();
        initAnalystTripPerLocation();
        initOpsTripPerDay();
        initOpsTripPerLocation();
        $("#btnLocate").click(function() {
            var lon = $("#lon").val();
            var lat = $("#lat").val();
            locateTo(lon, lat);
        });

        $(".input-daterange").datepicker({
            format: 'yyyy-mm-dd',
            startDate: '2015-01-01',
            endDate: '2015-01-31'
        });

        $("#btnQuery").click(updateAnalystView);
    }

    function updateAnalystView() {
        var startTime = $("#start").val();
        var endTime = $("#end").val();
        var queryDaily = btoa(tplQuery(startTime, endTime));
        var queryLocation = btoa(tplPerLocQuery(startTime, endTime));
        queryStat(queryDaily, data => {
            var chartData = prepareTrendData(data);
            chartAnalystTripsPerDay.update({
                series: chartData
            });

        });
        queryStat(queryLocation, data => {
            var chartData = preparePerLocationData(data);
            chartAnalystTripsPerLocation.update({
                series: chartData
            });
        });
    }

    function showOpsView() {
        queryDailyTrend(function(data) {
            chartTripsPerDay.update({
                series: data
            });
        });
        queryPerLocation(data => {
            chartTripsPerLocation.update({
                series: data
            });
        });
        queryRealTime(function(data) {
            chartTrend.update({
                series: data
            });
        });
    }

    function locateTo(lon, lat)
    {
        centerPt = new BMapGL.Point(lon, lat);
        curLon = lon;
        curLat = lat;
        map.centerAndZoom(centerPt, 13);
        searchCircle.setCenter(centerPt)
    }

    function showDriverView(data) {
        var centerPt = new BMapGL.Point(-73.954, 40.736284);
        map = new BMapGL.Map("nearby_map");    // 创建Map实例
        map.centerAndZoom(centerPt, 13);  // 初始化地图,设置中心点坐标和地图级别
        map.enableScrollWheelZoom(true);     //开启鼠标滚轮缩放
        var view = new mapvgl.View({
            map: map
        });
        map.setMapStyleV2({
            style: 'midnight'
        });

        searchCircle = new BMapGL.Circle(centerPt, 6000, {
            fillOpacity: 0.5,
            strokeOpacity: 0.9,
            strokeWeight: 5,
            strokeStyle: 'dashed',
            strokeColor: 'blue'
        });
        map.addOverlay(searchCircle);

        // var myIcon = new BMapGL.Icon("markers.png", new BMapGL.Size(23, 25), {
        //     // 指定定位位置。
        //     // 当标注显示在地图上时，其所指向的地理位置距离图标左上
        //     // 角各偏移10像素和25像素。您可以看到在本例中该位置即是
        //     // 图标中央下端的尖角位置。
        //     anchor: new BMapGL.Size(10, 25),
        //     // 设置图片偏移。
        //     // 当您需要从一幅较大的图片中截取某部分作为标注图标时，您
        //     // 需要指定大图的偏移位置，此做法与css sprites技术类似。
        //     imageOffset: new BMapGL.Size(0, 0 - 25)   // 设置图片偏移
        // });

        // var marker = new BMapGL.Marker(new BMapGL.Point(-73.954,  40.738284), myIcon);
        // map.addOverlay(marker);

        addTripOverlay(map, {});
    }

    function updateNearBy() {
        queryNearBy(curLon, curLat, data => {
            layer.setData(data);
        });
    }

    function stopJobs() {
        jobs.forEach(job => {
            console.log("stop job: " + job);
            clearInterval(job);
        });
        jobs = [];
    }

    function addTripOverlay(map, data) {
        // for(var i=0;i<data.length;i++) {
        //     var label = new BMapGL.Label("coord: (" + data[i][1] + ", "+  data[i][2] + " )", {
        //         position: new BMapGL.Point(data[i][1],  data[i][2]),
        //         offset: new BMapGL.Size(10, 20)
        //     });
        //     label.setStyle({                              // 设置label的样式
        //         color: '#000',
        //         fontSize: '30px',
        //         border: '2px solid #1E90FF'
        //     })
        //     map.addOverlay(label);
        // }



        var view = new mapvgl.View({
            map: map
        });
        // var dataSet = new mapvgl.DataSet(data);

        layer = new mapvgl.PointLayer({
            color: 'rgba(200, 50, 50, 1)',
            blend: 'lighter',
            size: 10
        });

        view.addLayer(layer);
        layer.setData(data);
    }


    function queryStat(query, callback) {
        console.log(atob(query));
        $.ajax({
            url: QUERY_URI,
            type: 'GET',
            data: {
                // SELECT cab_type, date, SUM(trips) AS trips FROM daily GROUP BY cab_type, date ORDER BY cab_type, date;
                'query': query
            },
            success: function(data) {
                // console.log(data);
                callback(JSON.parse(data))
            }
        });

        // var data = prepareData();
        // callback(data);
    }

    function queryNearBy(lon, lat, callback) {
        console.log("call query api to get nearby trips");
        $.ajax({
            url: NEARBY_URL,
            type: 'GET',
            data: {
                // SELECT cab_type, date, SUM(trips) AS trips FROM daily GROUP BY cab_type, date ORDER BY cab_type, date;
                'lon': lon,
                'lat': lat
            },
            success: function(data) {
                // console.log(data);
                var data = prepareNearByData(JSON.parse(data))
                callback(data)
            }
        });
    }

    function queryPerLocation(callback) {
        console.log("refresh perLocation statistics");
        var dataStr = localStorage.getItem("perLocation");
        if(dataStr == null || dataStr == '') {
            console.log("call query api to get perlocation statistics")
            var query = btoa(tplPerLocQuery('2015-01-01', '2015-01-31'));
            queryStat(query, data => {
                var data = preparePerLocationData(data);
                localStorage.setItem("perLocation", JSON.stringify(data));
                callback(data);
            });
        } else {
            callback(JSON.parse(dataStr));
        }
   }

    function queryDailyTrend(callback) {
        console.log("refresh daily statistics")
        var dataStr = localStorage.getItem("daily");
        if(dataStr == null || dataStr == '') {
            console.log("call query api to get daily statistics")
            var query = btoa(tplQuery("2015-01-01", "2015-01-09"));
            queryStat(query, data => {
                var data = prepareTrendData(data);
                localStorage.setItem("daily", JSON.stringify(data));
                callback(data);
            });
            // var data = prepareTrendData(daily);
            // localStorage.setItem("daily", JSON.stringify(data));
            // callback(data);
        } else {
            callback(JSON.parse(dataStr));
        }
    }

    function queryRealTime(callback) {
        console.log("call query api to get 10min statistics")
        var query = btoa(tpl10min(10));
        queryStat(query, data => {
            var data = prepareTrendData(data);
            callback(data);
        });

        // var data = prepareRealTimeData();
        // callback(data);
    }

    // Main
    cognitoAuth();
    // showDashboard("operators");
}