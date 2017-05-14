if(typeof PageInterface!='undefined') {
    if (typeof PageInterface.userdata == 'undefined') {
        console.log('Created: PageInterface.userdata');
        PageInterface.userdata = new function () {
            var module = this;
            module.appLoaded = false;
            module.userdataApp = angular.module('userdataApp', []);
            module.init = function (callback) {
                if(typeof callback=='undefined') callback = function() {};
                Core.dynamic.load({
                    template:{url:'/js/modules/userdata/userdata.htm',dom:document.getElementById('userdata.htm')}
                },function(){
                    if(!module.appLoaded) {
                        module.loadApp();
                    }
                    callback();
                });
            }
            module.loadApp = function() {
                module.appLoaded = true;
                Bloombees.getUserData(function () {
                    module.userdataApp.controller('userdataController', function($scope) {
                        //$scope.User = Core.data.get('getUserData').data.User;
                        $scope.User = Core.data.get('getUserData').data.User;
                        //console.log(Core.data.get('getUserData').data.User);
                    });
                    angular.bootstrap(document.getElementById('userdata.js'),['userdataApp']);
                },true);
            }
        }
    }
}