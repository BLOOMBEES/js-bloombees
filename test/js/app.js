PageInterface = new function() {
    var app = this;

    //angularApp.controller('personalDataController', function($scope) {});
    app.init = function () {
        Bloombees.debug = true;
        // Control of auth
        if(oauth = Core.url.formParams('oauth')) {
            window.focus();
            Core.cookies.set('oauth',oauth);
            window.close();
        } if(oauthconnect = Core.url.formParams('oauthconnect')) {
            window.focus();
            Core.cookies.set('oauthconnect',oauthconnect);
            window.close();
        } else {
            Bloombees.init(function () {
                app.reset();
            });
        }
    }

    // needed to reset all the interface when sigin or signout
    app.reset = function() {
        app.loading(true);
        // Init knockout app for homeTemplate
        app.auth.init();
        app.publicTemplate.init();
        app.footerTemplate.init();

        if(Bloombees.isAuth()) {
            app.components.load(function(){
                $('#authTemplate').show();
                app.loading(false);
            });
        } else {
            $('#authTemplate').hide();
            app.loading(false);
        }

    }

    // Knockout app to manage authentication
    app.auth = new function () {

        var module = this;
        module.ko = null;
        module.init = function (callback) {
            if(module.ko == null){
                module.ko = new module.knockout();
                ko.applyBindings(module.ko,document.getElementById('topNav'));
            }
            else
                module.ko.reset();
        }
        // knockout app to control login, logout and socialnetworks
        module.knockout = function () {
            var self = this;
            self.isAuth = ko.observable(Bloombees.isAuth());
            self.userData = ko.observable({User_email: Core.user.info['User_email']});
            // Jquery binders
            if(true) {
                // Signin module using Jquery.validator
                $('#signin').validator().on('submit', function (e) {
                    if (e.isDefaultPrevented()) {
                        // handle the invalid form...
                    } else {
                        PageInterface.loading(true);
                        Bloombees.login({email:self.loginEmail(),password:self.loginPassword()},function(response) {

                            if(!response.success) {
                                self.reset();
                                PageInterface.loading(false);
                                PageInterface.alertMsg('Error','User does not exist','type-warning');
                            } else {
                                app.reset();
                            }
                        });
                        return false;
                    }
                });
            }

            // Login/password
            self.loginEmail = ko.observable();
            self.loginPassword = ko.observable();
            self.logout = function() {
                module.logOut();
            }

            // Reset all the components based on the values
            self.reset = function() {
                self.isAuth(Bloombees.isAuth());
                self.userData({User_email: Core.user.info['User_email']});
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
                                module.knockout.reset();
                            } else {
                                app.reset();
                            }
                        });
                        //do callback stuff
                    } else {
                        module.knockout.reset();
                    }
                }
            });
        }

        // logout
        module.logOut = function () {
            PageInterface.loading(true);
            Bloombees.logout(function(){
                app.reset();
                PageInterface.loading(false);
            });
        }
    }

    // Knockout app
    app.publicTemplate = new function () {
        var module = this;
        module.ko = null;
        module.init = function () {
            if(module.ko == null){
                module.ko = new module.knockout();
                ko.applyBindings(module.ko,document.getElementById('publicTemplate'));
            }
            else
                module.ko.reset();
        }

        module.knockout = function() {
            var self = this;
            self.isAuth = ko.observable(Bloombees.isAuth());
            self.reset = function () {
                self.isAuth(Bloombees.isAuth());
            }
        }
    }

    // Knockout app
    app.footerTemplate = new function () {
        var module = this;
        module.ko = null;
        module.init = function () {

            if(module.ko == null){
                module.ko = new module.knockout();
                ko.applyBindings(module.ko,document.getElementById('footerNav'));
            }
            else
                module.ko.reset();
        }
        module.knockout = function() {
            var self = this;
            self.bottomData = ko.observable({
                bloombeesAPI: Core.config.get('bloombeesAPI'),
                bbtoken: Core.user.getCookieValue(),
                bbhash: Core.cookies.get(Bloombees.cookieNameForHash)
            });
            self.reset = function () {
                self.bottomData({
                    bloombeesAPI: Core.config.get('bloombeesAPI'),
                    bbtoken: Core.user.getCookieValue(),
                    bbhash: Core.cookies.get(Bloombees.cookieNameForHash)
                });
            }
        }
    }

    // Jquery loading effect
    app.loading = function (state) {
        if(state) {
            $('#loader').show();
            $('#app').hide();
        } else {
            $('#loader').hide();
            $('#app').show();
        }
    }

    // Jquery alertMsg effect
    app.alertMsg = function (title,msg,type) {
        if(typeof type=='undefined') type = 'type-default';
        BootstrapDialog.show({
            title: title,
            message: msg,
            type: type
        });
    }

    //Dynamic loader
    app.components = new function() {
        var module = this;
        module.loadScripts = function (script,callback) {
            Core.dynamic.load({
                script:{url:'/js/modules/'+script+'/'+script+'.js'}
            },function(){
                if(typeof PageInterface[script] == 'undefined') {
                    PageInterface.error('loading /js/modules/'+script+'/'+script+'.js');
                    callback();
                }
                else {
                    try {
                        console.log('loaded js/modules/'+script+'/'+script+'.js');
                        PageInterface[script].init(function() {
                            callback();
                        });
                    } catch (err) {
                        console.log(err);
                        callback();
                    }
                }
            });
        }
        module.socialnetworks= function (resolve) {
            if(!Bloombees.isAuth()) return resolve();
            module.loadScripts('socialnetworks',function(){
                resolve();
            });
        }
        module.userdata= function (resolve) {
            module.loadScripts('userdata',function(){
                resolve();
            });
        }
        module.load = function(callback) {
            Core.bind([module.socialnetworks,module.userdata], function () {
                callback();
            });
        }
    }

    app.error = function (msg) {
        Core.log.print('[PageInterface] '+msg);
    }
};


