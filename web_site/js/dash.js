function init() {

    const   clientIdParamName = "cid",
            userPoolIdParamName = "upid",
            identityPoolIdParamName = "ipid",
            cognitoRegionParamName = "r";
            GroupName = "group";

    var streamName,
        streamType,
        rate,
        sendDataHandle,
        totalRecordsSent = 0,
        cognitoAppClientId = getCongitoConfigParameterByName(clientIdParamName),
        cognitoUserPoolId = getCongitoConfigParameterByName(userPoolIdParamName),
        cognitoIdentityPoolId = getCongitoConfigParameterByName(identityPoolIdParamName),
        cognitoRegion = getCongitoConfigParameterByName(cognitoRegionParamName),
        cognitoUser;


    $("#userPoolId").val(cognitoUserPoolId);
    $("#identityPoolId").val(cognitoIdentityPoolId);
    $("#clientId").val(cognitoAppClientId);
    $("#userPoolRegion").val(cognitoRegion);

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
    var dateTime = [];
    var usersCounter = [];
    var androidUsers = [];
    var iOSUsers = [];
    var windowsUsers = [];
    var otherUsers = [];
    var quadA = [];
    var quadB = [];
    var quadC = [];
    var quadD = [];

    var osUsageData = [];
    var quadrantData = [];

    var colors = ["red", "green", "blue", "orange", "purple", "cyan", "magenta", "lime", "pink", "teal", "lavender", "brown", "beige", "maroon", "mint", "olive", "coral"];
    var dynamicColors = function(i) {
        if (i >= 0 && i < colors.length) return colors[i];
        var r = Math.floor(Math.random() * 255);
        var g = Math.floor(Math.random() * 255);
        var b = Math.floor(Math.random() * 255);
        return "rgb(" + r + "," + g + "," + b + ")";
    }


    var identity = function(arg1) {
      return arg1;
    };

    var cognitoAuth = function() {

        $("#logoutLink").click( function() {
                cognitoUser.signOut();
                localStorage.setItem(GroupName, "");
                $("#password").val("");
                $("#loginForm").removeClass("hidden");
                $("#logoutLink").addClass("hidden");
                $("#unauthMessage").removeClass("hidden");
                $("#dashboard_content").addClass("hidden");
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
                        else {
                            setTimeout( function() {
                                refreshAuthentication(userPool, userData);
                            }, 3600*1000);

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
                        }
                        else {
                            showDashboard(getCongitoConfigParameterByName(GroupName));
                            $("#unauthMessage").addClass("hidden");
                            $("#logoutLink").removeClass("hidden");
                            // $("#dashboard_content").removeClass("hidden");
                            $("#signInSpinner").addClass("hidden");
                            setTimeout( function() {
                                refreshAuthentication(userPool, userData);
                            }, 3600*1000);

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
    }

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
        switch(group) {
            case "analysts":
                $("#analyst_view").removeClass("hidden");
                $("#dashboard_content").removeClass("hidden");
                break;
            case "operators":
                $("#dashboard_content").removeClass("hidden");
                break;
            case "drivers":
                $("#driver_view").removeClass("hidden");
                break;
            default:
                console.log("Error group is invalid: " + group);
        }
    }

    cognitoAuth();

    function timeNow() {
        var d = new Date(),
            h = (d.getHours()<10?'0':'') + d.getHours(),
            m = (d.getMinutes()<10?'0':'') + d.getMinutes(),
            s = (d.getSeconds()<10?'0':'') + d.getSeconds();

        return h + ':' + m + ':' + s;
    }

}
