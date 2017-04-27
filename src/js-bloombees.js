Bloombees = new function () {
    // Config vars
    this.version = '1.0.2'
    this.debug = false;
    this.api = Core.config.get('bloombeesAPI') || 'https://bloombees.com/h/api';
    this.webKey = Core.config.get('bloombeesWebKey') || 'Development';
    this.cookieNameForToken = 'bbtoken';
    this.cookieNameForHash = 'bbhash';
    this.data = {};
    Core.request.base = this.api;
    Core.request.key = this.webKey;

    // Init Bloombees App
    this.init = function (callback) {
        Core.bind([Bloombees.initUserAuth],function(response) {
            if(Core.user.isAuth()) {

                // Add token for future call
                Core.request.token = Core.cookies.get(Bloombees.cookieNameForToken);
                if(Bloombees.debug) console.log('Added Core.request.token');
            }
            callback();
        });

    }

    // Init User auth
    this.initUserAuth = function (resolve,reject) {
        Core.user.init(Bloombees.cookieNameForToken);
        if(Core.user.isAuth()) {
            resolve();
        } else {
            if(cookie = Core.cookies.get(Bloombees.cookieNameForToken)) {
                console.log('cookie still exist');
                //---
                if(Bloombees.debug) console.log('Recovering user data from token /auth/check/dstoken');

                Core.request.token = cookie;
                Core.request.call({url:'/auth/check/dstoken',method:'GET'},function (response) {
                    if(response.success) {
                        if(Core.user.setAuth(true,Bloombees.cookieNameForToken)) {
                            Core.user.add(response.data);
                            //---
                            if(Bloombees.debug) console.log('Data recovered');
                        } else {
                            Core.error.add('Bloombees.login','Error in Core.user.setAuth(true,Bloombees.cookieNameForToken)');
                        }
                    } else {
                        Bloombees.data.reset();
                        Core.user.setAuth(false,Bloombees.cookieNameForToken);
                    }
                    resolve();
                });
            } else {
                Bloombees.data.reset();
                resolve();
            }
        }

    };

    // Login with userpassword
    this.login = function(data,callback) {
        Core.request.call({url:'/auth/userpassword',params:data,method:'POST'},function (response) {
            Core.user.setAuth(false);
            if(response.success) {
                Core.cookies.set(Bloombees.cookieNameForToken,response.data.dstoken);

                if(Core.user.setAuth(true,Bloombees.cookieNameForToken)) {
                    if(Bloombees.debug) Core.user.add(response.data);
                } else {
                    Core.error.add('Bloombees.login','Error in Core.user.setAuth(true,Bloombees.cookieNameForToken)');
                }
            }
            callback(response);
        });
    }

    // Execute an oauth based on a Bloombees oauth id
    this.oauth = function(oauth_id,callback) {
        Core.request.call({url:'/auth/oauthservice',params:{id:oauth_id},method:'POST'},function (response) {
            if(response.success) {
                Core.cookies.set(Bloombees.cookieNameForToken,response.data.dstoken);
                if(Core.user.setAuth(true,Bloombees.cookieNameForToken)) {
                    if(Bloombees.debug) Core.user.add(response.data);
                } else {
                    Core.error.add('Bloombees.oauth','Error in Core.user.setAuth(true,Bloombees.cookieNameForToken)');
                }
            }
            callback(response);
        });
    }

    // It says if the user is auth or not.
    this.isAuth = function() {
        return(Core.user.isAuth());
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
                Core.user.setAuth(false,Bloombees.cookieNameForToken);
                Bloombees.data.reset();
                Core.request.token = '';
                callback();
            });
        } else {
            Bloombees.data.reset();
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


        var data = Bloombees.data.get('getUserSocialNetworks');
        if(typeof data == 'undefined' || reload) {
            Bloombees.data.set('getUserSocialNetworks',{success:false});

            Core.request.call({url:'/socialnetworks/connections/'+Core.user.get('User_id'),method:'GET'},function (response) {
                if(response.success) {
                    Bloombees.data.set('getUserSocialNetworks',response);
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
    // Helper to add get Data
    this.data = new function () {

        this.info = {};

        this.add = function(data) {

            if(typeof data !='object') {
                Core.error.add('Bloombees.data.add(data)','data is not an object');
                return false;
            }

            for(k in data) {
                Bloombees.data.info[k] = data[k];
            }
            Core.cache.set('CloudFrameWorkAuthUser',Bloombees.data.info);
            return true;
        }

        this.set = function(key,value) {

            if(typeof key !='string') {
                Core.error.add('Bloombees.data.set(key,value)','key is not a string');
                return false;
            }

            Bloombees.data.info[key] = value;
            Core.cache.set('CloudFrameWorkAuthUser',Bloombees.data.info);
            return true;
        }

        this.get = function(key) {
            if(typeof key =='undefined') return;

            return(Bloombees.data.info[key]);
        }

        this.reset = function() {
            Bloombees.data.info = {};
        }
    };
}