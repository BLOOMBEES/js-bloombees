Bloombees = new function () {
    // Config vars
    this.version = '1.1.4';
    this.debug = false;
    this.apiUrl = Core.config.get('bloombeesApiUrl') || 'https://bloombees.com/h/api';
    this.oAuthUrl = Core.config.get('bloombeesOAuthUrl') || 'https://bloombees.com/h/service/oauth';
    this.webKey = Core.config.get('bloombeesWebKey') || 'Development';
    this.cookieNameForToken = 'bbtoken';
    this.cookieNameForHash = 'bbhash';
    this.lang = Core.config.get('bloombeesLang') || 'en';
    this.data = {};
    this.hashActive = false;                        // Generate a hash to allow backend doing calls
    this.authActive = true;                        // Generate a hash to allow backend doing calls
    this.refreshCacheHours = 24;

    Core.authCookieName = this.cookieNameForToken;  // Asign the local name of the cookie for auth
    Core.authActive = this.authActive;              // Let's active the authorization mode
    Core.request.base = this.apiUrl;                // Default calls by default
    Core.request.key = this.webKey;                 // Default calls by default
    Core.debug = false;


    // ------------------
    // Init Bloombees App
    // ------------------
    this.init = function (callback) {

        Core.request.key = Bloombees.webKey;                 // Default webkey by default X-WEB-KEY
        Core.request.token = '';                        // Default X-DS-TOKEN to '' until init
        Core.authCookieName = Bloombees.cookieNameForToken;  // Asign the local name of the cookie for auth
        Core.authActive = Bloombees.authActive;              // Let's active the authorization mode
        Core.request.base = Bloombees.apiUrl;                // Default calls by default
        Core.request.key = Bloombees.webKey;                 // Default calls by default

        // Activate check Bloombees Methods
        var initFunctions = [Bloombees.checkConfigData, Bloombees.checkMarketingParams];
        if(Bloombees.authActive) initFunctions.push(Bloombees.checkDSToken);
        if(Bloombees.hashActive) initFunctions.push(Bloombees.checkHashCookie);

        // initiating Core.
        Core.init(initFunctions,function(response) {
            if(!response.success) Bloombees.error('Bloombees.init has returned with error');
            if(typeof callback =='function') callback();
        });
    }

    // checkDataHelpers read data general info to be used in other applications like: countries, currencies etc..
    this.checkConfigData = function(resolve) {
        Bloombees.data['config'] = Core.cache.get('BloombeesConfigData');

        // Evaluate refresh cache
        if((Bloombees.data['config'] != null) && (typeof Bloombees.data['config']['timestamp'] =='number') && !Core.url.formParams('_reloadBloombeesCache')) {
            var date = new Date();
            var cacheHours = (date.getTime()-Bloombees.data['config']['timestamp'])/(1000*3600); // Number of hours since last cache
            if(cacheHours >= Bloombees.refreshCacheHours) {
                Bloombees.data['config'] = null;
                console.log('Refresing cache in Bloombees.data.config');
            }
        }

        if((Bloombees.data['config'] == null) || Core.url.formParams('_reloadBloombeesCache')) {

            Bloombees.getConfigData(function(response) {
                if(response.success) {
                    Bloombees.data['config'] = response.data;
                    var date = new Date();
                    Bloombees.data['config']['timestamp'] = date.getTime();
                    Core.cache.set('BloombeesConfigData',Bloombees.data['config']);

                } else {
                    Bloombees.data['config'] = {};
                    Bloombees.error('checkConfigData');
                }
                if(Bloombees.debug) Core.log.printDebug('Bloombees.checkConfigData readed from api into Bloombees.data.config');
                resolve();
            });
        } else {
            if(Bloombees.debug) Core.log.printDebug('Bloombees.checkConfigData readed from cache into Bloombees.data.config');
            resolve();
        }
    }

    // CheckDSToken if it exist.. It has to be call with resolve. Normally called from .init
    this.checkDSToken = function(resolve) {
        if(Core.user.isAuth()) {
            // Assign in the calls the value of the user's cookie value
            Core.request.token = Core.user.getCookieValue();

            // We have to check that cookie is still available.
            if(Bloombees.debug && !Core.debug) Core.log.printDebug('Bloombees.checkDSToken(resolve) Checking the token in : /auth/check/dstoken');
            Core.request.call({url:'/auth/check/dstoken',method:'GET'},function (response) {
                if(response.success) {
                    Core.user.add(response.data);
                    if(Bloombees.debug) Core.log.printDebug('Bloombees.checkDSToken(resolve) Token ok: data recovered and Core.request.token assigned');
                } else {
                    if(Bloombees.debug) Core.log.printDebug('Bloombees.checkDSToken(resolve) Token error: deletin local credentials');
                    Core.user.setAuth(false);
                    Core.data.reset();
                    Core.request.token = '';
                }
                resolve();
            });
        } else {
            if(Bloombees.debug) Core.log.printDebug('Bloombees.checkDSToken(resolve) Core.isAuth() == false, so.. checking the token is not needed');
            if(Core.cookies.get(Bloombees.cookieNameForToken)) {
                console.log('cookie still exist');
            }
            Core.data.reset();
            Core.request.token = '';
            resolve();
        }
    }

    // checkHashCookie if it exist.. if not, it generates a new one. . Normally called from .init
    this.checkHashCookie = function(resolve) {

        var cookie = Core.cookies.get(Bloombees.cookieNameForHash);
        console.log(cookie);
        if(typeof cookie =='undefined' || !cookie ) {
            if(Bloombees.debug && !Core.debug) Core.log.printDebug('Bloombees.checkHashCookie(resolve) Getting the hash from: /auth/hash');
            Core.request.call({url:'/auth/hash',method:'GET'},function (response) {
                if(response.success) {
                    Core.cookies.set(Bloombees.cookieNameForHash,response.data);
                    if(Bloombees.debug) Core.log.printDebug('Bloombees.checkHashCookie(resolve) hash retrieved a hash for: '+Bloombees.cookieNameForHash);
                } else {
                    Bloombees.error('Bloombees.checkHashCookie(resolve)',response);
                }
                resolve();
            });
        } else {
            if(Bloombees.debug) Core.log.printDebug('Bloombees.checkHashCookie(resolve) avoiding call because a hash exists');
            resolve();
        }
    }

    // checkMarketingParams to analyze the url and save in cache[BloombeesParams] leaving it info accesible in Bloombees.data.params
    this.checkMarketingParams = function(resolve) {
        var BloombeesMktReceivedParams = {};

        if(Core.url.formParams('source')!=null) BloombeesMktReceivedParams['source'] = Core.url.formParams('source');
        if(Core.url.formParams('referrer')!=null) BloombeesMktReceivedParams['referrer'] = Core.url.formParams('referrer');
        if(Core.url.formParams('campaign')!=null) BloombeesMktReceivedParams['campaign'] = Core.url.formParams('campaign');
        if(Core.url.formParams('bbreferal')!=null) BloombeesMktReceivedParams['bbreferal'] = Core.url.formParams('bbreferal');


        Bloombees.data['params'] = Core.cache.get('BloombeesParams');
        // Evaluate refresh cache
        if((Bloombees.data['params'] != null) && (typeof Bloombees.data['params']['timestamp'] =='number') && !Core.url.formParams('_reloadBloombeesCache')) {
            var date = new Date();
            var cacheHours = (date.getTime()-Bloombees.data['params']['timestamp'])/(1000*3600); // Number of hours since last cache
            if(cacheHours >= Bloombees.refreshCacheHours) {
                Bloombees.data['params'] = null;
                console.log('Refresing cache in Bloombees.data.params');
            }
        }

        if((Bloombees.data['params'] == null) || Core.url.formParams('_reloadBloombeesCache') || Object.keys(BloombeesMktReceivedParams).length) {
            if(Bloombees.data['params'] == null || Core.url.formParams('_reloadBloombeesCache')) Bloombees.data['params'] = {};
            for(key in BloombeesMktReceivedParams) {
                Bloombees.data['params'][key] = BloombeesMktReceivedParams[key];
            }
            var date = new Date();
            Bloombees.data['params']['timestamp'] = date.getTime();
            Core.cache.set('BloombeesParams',Bloombees.data['params']);
            if(Bloombees.debug) Core.log.printDebug('Bloombees.checkMarketingParams read from params into Bloombees.data.params');

            resolve();
        } else {
            if(Bloombees.debug) Core.log.printDebug('Bloombees.checkMarketingParams readed from cache into Bloombees.data.params');
            resolve();
        }
    }

    // Asign URL to call by default as an API
    this.setApiUrl = function (url){
        if(Bloombees.debug ) Core.log.printDebug('Bloombees.setApiUrl("'+url+'")');
        if(typeof url != 'undefined') {
            Bloombees.apiUrl = url;
            Core.request.base = url;
            Core.config.set('bloombeesApiUrl',url);
        }
    }

    // Asign URL to call by default as an API
    this.setOAuthUrl = function (url){
        if(Bloombees.debug ) Core.log.printDebug('Bloombees.setOAuthUrl("'+url+'")');
        if(typeof url != 'undefined') {
            Bloombees.oAuthUrl = url;
            Core.config.set('bloombeesOAuthUrl',url);
        }
    }

    // Change webKeys for the calls
    this.setWebKey = function (key){
        if(Bloombees.debug ) Core.log.printDebug('Bloombees.setWebKey("'+key+'")');
        if(typeof key != 'undefined') {
            Bloombees.webKey = key;
            Core.request.key = this.webKey;
            Core.config.set('bloombeesWebKey',key);
        }
    }


    // It opens a popup calling https://bloombees.com/h/service/oauth/{social}?ret=retUrl. The implementation of the retUrl
    this.signInWithOauthPopUp = function (social, retUrl,callback) {

        if((typeof social =='undefined') ) {
            var response = {success:false, errors:["Bloombees.signInWithOauth(social,retUrl,callback) missing social=(facebook|google|instagram)"]};
            if(typeof callback != 'undefined') callback(response);
            return Bloombees.error('Bloombees.signInWithOauth(social,retUrl,callback) missing social=(facebook|google|instagram)');
        }

        if((typeof retUrl =='undefined') || !retUrl.indexOf("{id}")  ) {
            var response = {success:false, errors:["Bloombees.signInWithOauth(social, retUrl,callback) missing a right retUrl included '?oauth_signin={id}' substring to subtitute it."]};
            if(typeof callback != 'undefined') callback(response);
            return Bloombees.error('Bloombees.signInWithOauth(social, retUrl,callback) missing a right retUrl included "?oauth_signin={id}" substring to subtitute it.');
        }

        Core.oauthpopup({
            path: Core.config.get('bloombeesOAuthUrl')+'/'+social+'?ret='+retUrl,
            callback: function()
            {
                var oauth_id = Core.cookies.get('oauth_signin');
                if(oauth_id) {
                    Core.cookies.remove('oauth_signin');
                    Bloombees.oauth(oauth_id,function(response) {
                        if(typeof callback != 'undefined') callback(response);
                        else console.log(response);
                    });
                    //do callback stuff
                } else {
                    response = {success:false, errors:["missing cookie 'oauth_signin'. Apply in retUrl the JavaScriptCode to save the cookie oauth_signin"]};
                    loader.removeClass('animated zoomOut active error');
                    if(typeof callback != 'undefined') callback(response);
                    else console.log(response);
                }
            }
        });
    };



    // Login with userpassword
    this.signInWithUserPassword = function(data,callback) {
        if(Bloombees.debug && !Core.debug) Core.log.printDebug('Bloombees.login calling: /auth/userpassword');
        Core.request.call({url:'/auth/userpassword',params:data,method:'POST'},function (response) {
            if(Core.user.isAuth()) Core.user.setAuth(false);
            if(response.success) {
                Core.cookies.set(Bloombees.cookieNameForToken,response.data.dstoken);
                if(Core.user.setAuth(true)) {
                    Core.request.token = Core.user.getCookieValue();
                    Core.user.add(response.data);
                    if(Bloombees.debug && !Core.debug) Core.log.printDebug('Bloombees.login added user info: '+JSON.stringify(response.data));
                } else {
                    Bloombees.error('Bloombees.login','Error in Core.user.setAuth(true)');
                }
            } else {
                Bloombees.error('Bloombees.login',response);
            }
            callback(response);
        });
    }

    // Login with userpassword
    this.signUp = function(data,callback) {
        if(Bloombees.debug && !Core.debug) Core.log.printDebug('Bloombees.signUp calling: /register/user');
        Core.request.call({url:'/register/user',params:data,method:'POST'},function (response) {
            if(Core.user.isAuth()) Core.user.setAuth(false);
            if(response.success) {
                if(typeof response.data.dstoken!='undefined') {
                    Core.cookies.set(Bloombees.cookieNameForToken,response.data.dstoken);
                    if(Core.user.setAuth(true)) {
                        Core.request.token = Core.user.getCookieValue();
                        Core.user.add(response.data);
                        if(Bloombees.debug && !Core.debug) Core.log.printDebug('Bloombees.signUp added user info: '+JSON.stringify(response.data));
                    } else {
                        Bloombees.error('Bloombees.signUp','Error in Core.user.setAuth(true)');
                    }
                }
            } else {
                Bloombees.error('Bloombees.signUp',response);
            }
            callback(response);
        });
    }

    // Check if a code available for signup
    this.signUpCodeAvailability = function(code,callback) {
        if(Bloombees.debug && !Core.debug) Core.log.printDebug('Bloombees.signUpCodeAvailability calling: /register/availability/code/{code}');
        Core.request.call({url:'/register/availability/code/'+code,method:'GET'},function (response) {
            callback(response);
        });
    }

    // Check if a code available for signup
    this.signUpUniqueIdAvailability = function(unique_id,callback) {
        if(Bloombees.debug && !Core.debug) Core.log.printDebug('Bloombees.signUpUniqueIdAvailability calling: /register/availability/store/{unique_id}');
        Core.request.call({url:'/register/availability/store/'+unique_id,method:'GET'},function (response) {
            callback(response);
        });
    }

    // Execute an oauth based on a Bloombees oauth id
    this.oauth = function(oauth_id,callback) {
        if(Bloombees.debug && !Core.debug) Core.log.printDebug('Bloombees.oauth calling: /auth/oauthservice');
        Core.request.call({url:'/auth/oauthservice',params:{id:oauth_id},method:'POST'},function (response) {
            if(response.success) {
                Core.cookies.set(Bloombees.cookieNameForToken,response.data.dstoken);
                if(Core.user.setAuth(true)) {
                    Core.request.token = Core.user.getCookieValue();
                    Core.user.add(response.data);
                    if(Bloombees.debug && !Core.debug) Core.log.printDebug('Bloombees.oauth added user info: '+JSON.stringify(response.data));
                } else {
                    Bloombees.error('Bloombees.oauth','Error in Core.user.setAuth(true)');
                }
            }else {
                Bloombees.error('Bloombees.oauth',response);
            }
            callback(response);
        });
    }

    // It says if the user is auth or not.
    this.isAuth = function() {
        return(Core.user.isAuth()===true);
    }

    // Execute a logOut
    this.logOut = function(callback) {
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
                if(typeof callback != 'undefined') callback();
            });
        } else {
            Core.data.reset();
            Core.request.token = '';
            if(typeof callback != 'undefined') callback();
        }
    }

    // Return the token from Cookies with name: this.cookieNameForToken
    this.getToken = function() {return(Core.cookies.get(Bloombees.cookieNameForToken) || '')};

    // Return the token from Cookies with name: this.cookieNameForHash
    this.getHash = function() {return(Core.cookies.get(Bloombees.cookieNameForHash) || '')};

    // Return current info about the user
    this.getConfigData = function(callback,reload) {
        var data = Core.data.get('getConfigData');
        if(typeof data == 'undefined' || reload) {
            Core.data.set('getConfigData',{success:false});
            if(Bloombees.debug && !Core.debug) Core.log.printDebug('Bloombees.getConfigData calling: /data/info');
            Core.request.call({url:'/data/info',method:'GET'},function (response) {
                if(response.success) {
                    if(Bloombees.debug && !Core.debug) Core.log.printDebug('Bloombees.getConfigData added info: '+"Core.data.set('getConfigData',response);");
                    Core.data.set('getConfigData',response);
                }
                callback(response);
            });
        } else {
            callback(data);
        }
    }

    // Return current info about the user
    this.getUserData = function(callback,reload) {

        if(!Bloombees.isAuth()) {
            Bloombees.error('Bloombees.getUserData','user is not authenticated.');
            callback({success:false,error:['User is not authenticated in the frontend. Avoiding call']});
            return;
        }

        var data = Core.data.get('getUserData');
        if(typeof data == 'undefined' || reload) {
            Core.data.set('getUserData',{success:false});
            if(Bloombees.debug && !Core.debug) Core.log.printDebug('Bloombees.getUserData calling: /manage/users/'+Core.user.get('User_id'));
            Core.request.call({url:'/manage/users/'+Core.user.get('User_id'),method:'GET'},function (response) {
                if(response.success) {
                    if(Bloombees.debug && !Core.debug) Core.log.printDebug('Bloombees.getUserData added info: '+"Core.data.set('getUserData',response);");
                    Core.data.set('getUserData',response);
                }
                callback(response);
            });
        } else {
            callback(data);
        }
    }

    // Return current socialNetWorks
    this.getUserSocialNetworks = function(callback,reload) {

        if(!Bloombees.isAuth()) {
            Bloombees.error('Bloombees.getUserSocialNetworks','user is not authenticated.');
            callback({success:false,error:['User is not authenticated in the frontend. Avoiding call']});
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

    // Return current socialNetWorks
    this.getHTMLVersionOfTermsAndConditions = function(version,callback,reload) {

        if(typeof version != 'string') {
            Bloombees.error('Bloombees.getHTMLVersionOfTermsAndConditions','version is not a string.');
            callback('error loading terms.');
            return;
        }

        var data = Core.data.get('getHTMLVersionOfTermsAndConditions');
        if(typeof data == 'undefined' || reload) {
            Core.data.set('getHTMLVersionOfTermsAndConditions_'+version,null);

            Core.request.call({url:'/legal/tac/versions/'+version,method:'GET',responseType:'html'},function (response) {
                Core.data.set('getHTMLVersionOfTermsAndConditions_'+version,response);
                callback(response);
            });
        } else {
            callback(data);
        }
    }

    // connectUserSocialNetwork passing a oauth_id.. it requires
    this.connectUserSocialNetwork = function (oauth_id,callback) {
        if(!Bloombees.isAuth()) {
            Bloombees.error('Bloombees.getUserSocialNetworks','user is not auth end.');
            callback({success:false,error:['User is not auth in the frontend. Avoiding call']});
            return;
        }

        Core.request.call({url:'/socialnetworks/connections/'+Core.user.get('User_id')+'/oauthservice',params:{id:oauth_id},method:'POST'},function (response) {
            callback(response);
        });

    }

    // disconnectUserSocialNetwork
    this.disconnectUserSocialNetwork = function (social_id,callback) {
        if(!Bloombees.isAuth()) {
            Bloombees.error('Bloombees.getUserSocialNetworks','user is not auth end.');
            callback({success:false,error:['User is not auth in the frontend. Avoiding call']});
            return;
        }
        Core.request.call({url:'/socialnetworks/connections/'+Core.user.get('User_id')+'/'+social_id,method:'DELETE'},function (response) {
            callback(response);
        });
    }

    // callMeNow
    this.callMeNow = function(data,callback) {

        if(typeof data['Contact_name']=='undefined') return(Bloombees.error('Bloombees.callMeNow missing Contact_name'));
        if(typeof data['Contact_phone']=='undefined') return(Bloombees.error('Bloombees.callMeNow missing Contact_phone'));
        if(typeof data['Contact_sourceType']=='undefined') return(Bloombees.error('Bloombees.callMeNow missing Contact_sourceType'));
        if(typeof data['Contact_sourceSection']=='undefined') return(Bloombees.error('Bloombees.callMeNow missing Contact_sourceSection'));
        if(typeof data['Contact_lang']=='undefined') return(Bloombees.error('Bloombees.callMeNow missing Contact_lang'));

        Core.debug=true;
        Core.request.call({url:'/forms/callmenow',method:'POST',params:data},function (response) {
            callback(response);
        });
    }

    // Return current socialNetWorks
    this.getUserTermsAndConditions = function(callback,reload) {

        if(!Bloombees.isAuth()) {
            Bloombees.error('Bloombees.getUserTermsAndConditions','user is not authenticated.');
            callback({success:false,error:['User is not authenticated in the frontend. Avoiding call']});
            return;
        }

        var data = Core.data.get('getUserTermsAndConditions');
        if(typeof data == 'undefined' || reload) {
            Core.data.set('getUserTermsAndConditions',{success:false});

            Core.request.call({url:'/auth/terms/'+Core.user.get('User_id'),method:'GET'},function (response) {
                if(response.success) {
                    Core.data.set('getUserTermsAndConditions',response);
                }
                callback(response);
            });
        } else {
            callback(data);
        }
    }

    this.acceptUserTermsAndConditions = function(version,callback) {

        if(typeof version != 'string') {
            Bloombees.error('Bloombees.acceptUserTermsAndConditions','version is not a string.');
            callback({success:false,error:['Bloombees.acceptUserTermsAndConditions','version is not a string.']});
            return;
        }

        if(!Bloombees.isAuth()) {
            Bloombees.error('Bloombees.acceptUserTermsAndConditions','user is not authenticated.');
            callback({success:false,error:['User is not authenticated in the frontend. Avoiding call']});
            return;
        }
        Core.debug=true;
        Core.request.call({url:'/auth/terms/'+Core.user.get('User_id'),method:'POST',params:{User_termsId:version}},function (response) {
            callback(response);
        });
    }

    // Manage errors associated to Bloombees
    this.error = function(title,content) {
        if(typeof title == 'string') title = '[Bloombees.error] '+title;
        if(typeof content != 'undefined')
            console.log(title,content);
        else
            console.log(title);
    }


}