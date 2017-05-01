Bloombees = new function () {
    // Config vars
    this.version = '1.0.3'
    this.debug = true;
    this.api = Core.config.get('bloombeesAPI') || 'https://bloombees.com/h/api';
    this.webKey = Core.config.get('bloombeesWebKey') || 'Development';
    this.cookieNameForToken = 'bbtoken';
    this.cookieNameForHash = 'bbhash';
    this.data = {};

    Core.authCookieName = this.cookieNameForToken;  // Asign the local name of the cookie for auth
    Core.authActive = true;                         // Let's active the authorization mode
    Core.request.base = this.api;                   // Default calls by default

    Core.debug = false;


    // ------------------
    // Init Bloombees App
    // ------------------
    this.init = function (callback) {
        Core.request.key = this.webKey;                 // Default webkey by default X-WEB-KEY
        Core.request.token = '';                        // Default X-DS-TOKEN to '' until init
        Core.init([],function() {
            if(Core.user.isAuth()) {
                // Assign in the calls the value of the user's cookie value
                Core.request.token = Core.user.getCookieValue();

                // We have to check that cookie is still available.
                if(Bloombees.debug && !Core.debug) Core.log.printDebug('Checking the token in : /auth/check/dstoken');
                Core.request.call({url:'/auth/check/dstoken',method:'GET'},function (response) {
                    if(response.success) {
                        Core.user.add(response.data);
                        if(Bloombees.debug) Core.log.printDebug('Token ok: data recovered and Core.request.token assigned');
                    } else {
                        if(Bloombees.debug) Core.log.printDebug('Token error: deletin local credentials');

                        Core.user.setAuth(false);
                        Core.data.reset();
                        Core.request.token = '';
                    }
                    callback();
                });
            } else {
                if(Core.cookies.get(Bloombees.cookieNameForToken)) {
                    console.log('cookie still exist');
                }
                Core.data.reset();
                Core.request.token = '';
                callback();
            }
        });
    }

    // Login with userpassword
    this.login = function(data,callback) {
        Core.request.call({url:'/auth/userpassword',params:data,method:'POST'},function (response) {
            if(Core.user.isAuth()) Core.user.setAuth(false);
            if(response.success) {
                Core.cookies.set(Bloombees.cookieNameForToken,response.data.dstoken);
                if(Core.user.setAuth(true)) {
                    Core.request.token = Core.user.getCookieValue();
                    Core.user.add(response.data);
                    if(Bloombees.debug && !Core.debug) Core.log.printDebug('Added user info: '+JSON.stringify(response.data));
                } else {
                    Core.error.add('Bloombees.login','Error in Core.user.setAuth(true)');
                }
            } else {
                Core.error.add('Bloombees.login',response);
            }
            callback(response);
        });
    }

    // Execute an oauth based on a Bloombees oauth id
    this.oauth = function(oauth_id,callback) {
        Core.request.call({url:'/auth/oauthservice',params:{id:oauth_id},method:'POST'},function (response) {
            if(response.success) {
                Core.cookies.set(Bloombees.cookieNameForToken,response.data.dstoken);
                if(Core.user.setAuth(true)) {
                    Core.request.token = Core.user.getCookieValue();
                    Core.user.add(response.data);
                    if(Bloombees.debug && !Core.debug) Core.log.printDebug('Added user info: '+JSON.stringify(response.data));
                } else {
                    Core.error.add('Bloombees.oauth','Error in Core.user.setAuth(true)');
                }
            }else {
                Core.error.add('Bloombees.oauth',response);
            }
            callback(response);
        });
    }

    // It says if the user is auth or not.
    this.isAuth = function() {
        return(Core.user.isAuth()===true);
    }

    // Execute a logout
    this.logout = function(callback) {

        // Reset Bloombees Data
        if(Core.user.isAuth()) {
            Core.request.call({url:'/auth/deactivate/dstoken',method:'PUT'},function (response) {
                if(response.success) {
                    //---
                    if(Bloombees.debug) console.log('Token deleted');

                }
                Core.user.setAuth(false);
                Core.data.reset();
                Core.request.token = '';
                callback();
            });
        } else {
            Core.data.reset();
            Core.request.token = '';
            callback();
        }
    }

    // Return the token from Cookies with name: this.cookieNameForToken
    this.getToken = function() {return(Core.cookies.get(Bloombees.cookieNameForToken) || '')};

    // Return the token from Cookies with name: this.cookieNameForHash
    this.getHash = function() {return(Core.cookies.get(Bloombees.cookieNameForHash) || '')};


    // Return current socialNetWorks
    this.getUserSocialNetworks = function(callback,reload) {


        if(!Bloombees.isAuth()) {
            Core.error.add('Bloombees.getUserSocialNetworks','user is not auth end.');
            callback({success:false,error:['User is not auth in the frontend. Avoiding call']});
            return;
        }


        var data = Core.data.get('getUserSocialNetworks');
        if(typeof data == 'undefined' || reload) {
            Core.data.set('getUserSocialNetworks',{success:false});

            Core.request.call({url:'/socialnetworks/connections/'+Core.user.get('User_id'),method:'GET'},function (response) {
                if(response.success) {
                    Core.data.set('getUserSocialNetworks',response);
                }
                callback(response);
            });
        } else {
            callback(data);
        }
    }

    this.connectUserSocialNetwork = function (oauth_id,callback) {
        if(!Bloombees.isAuth()) {
            Core.error.add('Bloombees.getUserSocialNetworks','user is not auth end.');
            callback({success:false,error:['User is not auth in the frontend. Avoiding call']});
            return;
        }

        Core.request.call({url:'/socialnetworks/connections/'+Core.user.get('User_id')+'/oauthservice',params:{id:oauth_id},method:'POST'},function (response) {
            callback(response);
        });

    }

    this.disconnectUserSocialNetwork = function (social_id,callback) {
        if(!Bloombees.isAuth()) {
            Core.error.add('Bloombees.getUserSocialNetworks','user is not auth end.');
            callback({success:false,error:['User is not auth in the frontend. Avoiding call']});
            return;
        }
        Core.request.call({url:'/socialnetworks/connections/'+Core.user.get('User_id')+'/'+social_id,method:'DELETE'},function (response) {
            callback(response);
        });


    }
}