Bloombees = new function () {
    // Config vars
    this.version = '1.0'
    this.debug = false;
    this.api = Core.config.get('bloombeesAPI') || 'https://bloombees.com/h/api';
    this.webKey = Core.config.get('bloombeesWebKey') || 'Development';
    this.cookieNameForToken = 'bbtoken';
    this.cookieNameForHash = 'bbhash';
    Core.request.base = this.api;
    Core.request.key = this.webKey;

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
                    Core.user.setAuth(false);
                    if(response.success) {
                        if(Core.user.setAuth(true,Bloombees.cookieNameForToken)) {
                            Core.user.add(response.data);
                            //---
                            if(Bloombees.debug) console.log('Data recovered');
                        } else {
                            Core.error.add('Bloombees.login','Error in Core.user.setAuth(true,Bloombees.cookieNameForToken)');
                        }
                    } else {
                        Core.user.setAuth(false,Bloombees.cookieNameForToken);
                    }
                    resolve();
                });
            } else {
                resolve();
            }
        }

    };

    // Return the token from Cookies with name: this.token
    this.getToken = function() {return(Core.cookies.get(Bloombees.cookieNameForToken) || '')};
    this.getHash = function() {return(Core.cookies.get(Bloombees.cookieNameForHash) || '')};


    // It says if the user is auth or not.
    this.isAuth = function() {
        return(Core.user.isAuth());
    }


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

    this.logout = function(callback) {
        if(Core.user.isAuth()) {
            Core.request.call({url:'/auth/deactivate/dstoken',method:'PUT'},function (response) {
                if(response.success) {
                    //---
                    if(Bloombees.debug) console.log('Token deleted');

                }
                Core.user.setAuth(false,Bloombees.cookieNameForToken);
                callback();
            });
        } else {
            callback();
        }




    }
}