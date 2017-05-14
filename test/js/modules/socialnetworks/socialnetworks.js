if(typeof PageInterface!='undefined') {
    console.log(typeof PageInterface.socialnetworks);
    if (typeof PageInterface.socialnetworks == 'undefined') {
        PageInterface.socialnetworks = new function () {

            console.log('Created: PageInterface.socialnetworks');
            var module = this;
            module.ko = null;
            //module.angularApp = angular.module('angularApp', []);
            //module.angularApp.controller('personalDataController', function($scope) {});
            //angular.bootstrap(document.getElementById('personalDataApp'),['angularApp']);
            module.init = function (callback) {
                if(typeof callback=='undefined') callback = function() {};
                Core.dynamic.load({
                    template:{url:'/js/modules/socialnetworks/socialnetworks.htm',dom:document.getElementById('socialnetworks.htm')}
                },function(){
                    Core.bind([module.readConnectedSocialNetworks],function() {
                        if(module.ko==null) {
                            module.ko = new module.knockout();
                            ko.applyBindings(module.ko,document.getElementById('socialnetworks.js'));
                        }
                        module.ko.reset();
                        callback();
                    });
                });
            }

            // knockout app to control login, logout and socialnetworks
            module.knockout = function () {
                var self = this;
                self.isAuth = ko.observable(Bloombees.isAuth());

                // About social networks
                // -- DRAW Social Networks.
                // Transform and update socialNetworks based on Core.data.et('connectedSocialNetworks')
                self.socialNetworks = ko.observable([]);
                self.availableSocialNetWorks = {google:{active:false,id:null},facebook:{active:false,id:null},instagram:{active:false,id:null},twitter:{active:false,id:null},pinterest:{active:false,id:null},linkedin:{active:false,id:null},vk:{active:false,id:null}};

                self.drawSocialNetworksConnected = function() {
                    // Reset in each call
                    for (k in self.availableSocialNetWorks) {
                        self.availableSocialNetWorks[k].active = false;
                        self.availableSocialNetWorks[k].id = null;
                    }

                    // See current connected SocialNetworks
                    var connectedSocialNetworks = Core.data.get('connectedSocialNetworks');
                    if (Bloombees.isAuth()) {
                        if (typeof connectedSocialNetworks == 'object' && connectedSocialNetworks.length) {
                            // loop all the social networks to update it.
                            for (k in connectedSocialNetworks) {
                                sn = connectedSocialNetworks[k].SocialNetwork_name.toLowerCase();
                                id = connectedSocialNetworks[k].SocialNetwork_id;
                                if (typeof self.availableSocialNetWorks[sn] != 'undefined') {
                                    self.availableSocialNetWorks[sn].active = true;
                                    self.availableSocialNetWorks[sn].id = id;
                                }
                            }
                        } else {
                            Core.error.add('BloombeesModel.socialNetworksConnected: Error of programing. This condition should not happen');
                        }
                    }

                    // Transform data to be printed
                    snArray = [];
                    for(k in self.availableSocialNetWorks) {
                        snArray.push({sn:k,active:self.availableSocialNetWorks[k].active})
                    }
                    self.socialNetworks(snArray);

                }

                // Reset all the components based on the values
                self.reset = function() {
                    self.isAuth(Bloombees.isAuth());
                    self.drawSocialNetworksConnected();
                }
            };

            module.readConnectedSocialNetworks = function (resolve,reject) {
                Core.data.set('connectedSocialNetworks',[]);
                if(Bloombees.isAuth()) {
                    // Read
                    Bloombees.getUserSocialNetworks(function(response) {
                        if(response.success) {
                            Core.data.set('connectedSocialNetworks',response.data.SocialNetworks);
                            if(Bloombees.debug) Core.log.printDebug("Core.data.set('connectedSocialNetworks',response.data.SocialNetworks) executed");
                        }
                        resolve();
                    },true);
                } else {
                    resolve();
                }
            }

            // Connect or disconnect social networks for an Authenticated user.
            module.connectSocialNetwork = function (social) {
                var socialnetworks= module.ko.availableSocialNetWorks;
                if(typeof socialnetworks == 'undefined' || typeof socialnetworks[social] == undefined) {
                    Core.error.add('connectedSocialNetworks','missing socialnetworks or '+social);
                    return;
                }
                // Url to connect
                if(socialnetworks[social].active) {
                    if(confirm('Are you sure about disconnect '+social)) {
                        PageInterface.loading(true);
                        if(Bloombees.debug) Core.log.printDebug("module.connectSocialNetwork: disconnecting "+social+': '+socialnetworks[social].id);
                        Bloombees.disconnectUserSocialNetwork(socialnetworks[social].id,function(response) {
                            if(!response.success) {
                                PageInterface.alertMsg('Error',response.errors[0],'type-warning');
                                module.ko.reset();
                            } else {
                                Core.bind([module.readConnectedSocialNetworks],function() {
                                    module.ko.reset();
                                });
                            }
                        });
                    }

                } else {
                    if(confirm('Are you sure about connect '+social)) {
                        PageInterface.loading(true);
                        Core.oauthpopup({
                            path: Core.config.get('bloombeesOauth')+'/'+social+'?ret='+Core.url.parts('origin')+Core.url.parts('pathname')+'?oauthconnect={id}',
                            callback: function()
                            {
                                var oauth_id = Core.cookies.get('oauthconnect');
                                if(oauth_id) {
                                    console.log(oauth_id);
                                    Core.cookies.remove('oauthconnect');
                                    if(Bloombees.debug) Core.log.printDebug("module.connectSocialNetwork: connecting "+social+': '+oauth_id);
                                    Bloombees.connectUserSocialNetwork(oauth_id,function(response) {
                                        if(!response.success) {
                                            PageInterface.alertMsg('Error',response.errors[0],'type-warning');
                                            module.ko.reset();
                                            PageInterface.loading(false);
                                        } else {
                                            Core.bind([module.readConnectedSocialNetworks],function() {
                                                module.ko.reset();
                                                PageInterface.loading(false);
                                            });
                                        }
                                    });

                                    //do callback stuff
                                } else {
                                    module.ko.reset();
                                    PageInterface.loading(false);
                                }
                            }
                        });
                    }
                }
            }
            // Reset interfaces
            module.reset = function() {
                self.isAuth(Bloombees.isAuth());
                self.drawSocialNetworksConnected();
            }
        }
    }
}