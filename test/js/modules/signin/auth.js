if(typeof PageInterface!='undefined') {
    if (typeof PageInterface.auth == 'undefined') {
        PageInterface.auth = new function () {

            var module = this;
            module.init = function (callback) {
                Core.bind(module.readConnectedSocialNetworks,function(){
                    ko.applyBindings(module.vm);
                    if (Bloombees.isAuth()) module.vm.drawSocialNetworksConnected();
                    if(typeof callback=='function') callback();

                });
            }

            // knockout app to control login, logout and socialnetworks
            module.vm = new  function () {
                var self = this;
                self.init = false;
                self.isAuth = ko.observable(Bloombees.isAuth());
                self.userData = ko.observable({Store_uniqueId: Core.user.info['Store_uniqueId']});

                // Jquery binders
                if(true) {
                    // Signin module using Jquery.validator
                    $('#signin').validator().on('submit', function (e) {
                        if (e.isDefaultPrevented()) {
                            // handle the invalid form...
                        } else {
                            PageInterface.loading(true);
                            Bloombees.login({email:module.vm.loginEmail(),password:module.vm.loginPassword()},function(response) {
                                if(!response.success) {
                                    module.vm.reset();
                                    PageInterface.alertMsg('Error','User does not exist','type-warning');
                                } else {
                                    Core.bind([module.readConnectedSocialNetworks],function() {
                                        module.vm.reset();
                                    });
                                }
                            });
                            return false;
                        }
                    });
                }

                self.loadHomeTemplate = function() {
                    if(self.isAuth ) {
                        return('/directives/auth/home.htm');
                    } else {
                        return('/directives/noauth/home.htm');

                    }
                }

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

                self.bottomData = ko.observable({ bloombeesAPI: Core.config.get('bloombeesAPI'), bbtoken: Core.user.getCookieValue(), bbhash: Core.cookies.get(Bloombees.cookieNameForHash)});
                // Reset all the components based on the values
                self.reset = function() {
                    self.isAuth(Bloombees.isAuth());
                    self.userData({Store_uniqueId: Core.user.info['Store_uniqueId']});
                    self.bottomData({bloombeesAPI: Core.config.get('bloombeesAPI'),bbtoken:Core.user.getCookieValue(),bbhash:Core.cookies.get(Bloombees.cookieNameForHash)});
                    self.drawSocialNetworksConnected();
                    PageInterface.loading(false);
                }

                // Login/password
                self.loginEmail = ko.observable();
                self.loginPassword = ko.observable();
                self.logout = function() {
                    module.logOut();
                }

            };

            // Signin through SocialNetWorks
            module.signInViaOauth = function (social) {
                PageInterface.loading(true);
                Core.oauthpopup({
                    path: Core.config.get('bloombeesOauth')+'/'+social+'?ret='+Core.url.parts('origin')+Core.url.parts('pathname')+'?oauth={id}',
                    callback: function()
                    {
                        var oauth_id = Core.cookies.get('oauth');
                        if(oauth_id) {
                            console.log(oauth_id);
                            Core.cookies.remove('oauth');
                            Bloombees.oauth(oauth_id,function(response) {
                                if(!response.success) {
                                    PageInterface.alertMsg('Error',JSON.stringify(response.errors),'type-warning');
                                    module.vm.reset();
                                } else {
                                    Core.bind([module.readConnectedSocialNetworks],function() {
                                        module.vm.reset();
                                    });
                                }
                            });

                            //do callback stuff
                        } else {
                            module.vm.reset();
                        }
                    }
                });
            }



            module.logOut = function () {
                PageInterface.loading(true);
                Bloombees.logout(function(){
                    module.vm.reset();
                });
            }

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
                var socialnetworks= module.vm.availableSocialNetWorks;
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
                                module.vm.reset();
                            } else {
                                Core.bind([module.readConnectedSocialNetworks],function() {
                                    module.vm.reset();
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
                                            module.vm.reset();
                                        } else {
                                            Core.bind([module.readConnectedSocialNetworks],function() {
                                                module.vm.reset();
                                            });
                                        }
                                    });

                                    //do callback stuff
                                } else {
                                    module.vm.reset();
                                }
                            }
                        });

                    }
                }

            }

        }
    }
}