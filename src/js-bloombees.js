Bloombees = new function () {
    // Config vars
    this.version = '1.2.14';
    this.debug = false;
    this.apiUrl = Core.config.get('bloombeesApiUrl') || 'https://openapi.bloombees.com/h/api';
    this.oAuthUrl = Core.config.get('bloombeesOAuthUrl') || 'https://bloombees.com/h/service/oauth';
    this.webKey = Core.config.get('bloombeesWebKey') || 'Development';
    this.cookieNameForToken = 'bbtoken';
    this.cookieNameForHash = 'bbhash';
    this.lang = Core.config.get('bloombeesLang') || 'en';
    this.data = {};
    this.hashActive = false;                        // Generate a hash to allow backend doing calls
    this.authActive = true;                        // Generate a hash to allow backend doing calls
    this.refreshCacheHours = 24;
    this.clientCountry = Core.config.get('clientCountry');
    this.initiated = null;

    Core.authCookieName = this.cookieNameForToken;  // Asign the local name of the cookie for auth
    Core.authActive = this.authActive;              // Let's active the authorization mode
    Core.request.base = this.apiUrl;                // Default calls by default
    Core.request.key = this.webKey;                 // Default calls by default
    Core.debug = false;


    // ------------------
    // Init Bloombees App
    // ------------------
    this.init = function (callback) {

        Bloombees.initiated = false;
        Core.request.key = Bloombees.webKey;                 // Default webkey by default X-WEB-KEY
        Core.request.token = '';                        // Default X-DS-TOKEN to '' until init
        Core.authCookieName = Bloombees.cookieNameForToken;  // Asign the local name of the cookie for auth
        Core.authActive = Bloombees.authActive;              // Let's active the authorization mode
        Core.request.base = Bloombees.apiUrl;                // Default calls by default
        Core.request.key = Bloombees.webKey;                 // Default calls by default
        Bloombees.clientCountry = Core.config.get('clientCountry');


        // Activate check Bloombees Methods
        var initFunctions = [Bloombees.checkConfigData, Bloombees.checkMarketingParams];
        if(Bloombees.authActive) initFunctions.push(Bloombees.checkDSToken);
        if(Bloombees.hashActive) initFunctions.push(Bloombees.checkHashCookie);
        if(Bloombees.clientCountry =='ZZ' || Bloombees.clientCountry == null)  initFunctions.push(Bloombees.checkGeoData);

        // initiating Core.
        Core.init(initFunctions,function(response) {
            Bloombees.initiated = true;
            if(!response.success) Bloombees.error('Bloombees.init has returned with error');
            if(typeof callback =='function') callback();
        });
    }

    // Allow external processes wait until we finish the calls
    this.waitUntilInit = function(callback) {
        function _wait() {
            if(Bloombees.initiated == true){
                callback();
            }
            else{
                // Wait 250 ms
                setTimeout(_wait, 250);
            }
        }
        _wait();
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
                    if(Bloombees.debug) Core.log.printDebug('Bloombees.checkDSToken(resolve) Token error: deleting local credentials');
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

    // refreshDSToken check if it exist.. and refresh the info
    this.refreshDSToken = function(resolve) {
        if(Core.user.isAuth()) {
            // Assign in the calls the value of the user's cookie value
            Core.request.token = Core.user.getCookieValue();

            // We have to check that cookie is still available.
            if(Bloombees.debug && !Core.debug) Core.log.printDebug('Bloombees.refreshDSToken(resolve) Checking the token in : /auth/check/dstoken?refresh');
            Core.request.call({url:'/auth/check/dstoken?refresh',method:'GET'},function (response) {
                if(response.success) {
                    Core.user.add(response.data);
                    if(Bloombees.debug) Core.log.printDebug('Bloombees.refreshDSToken(resolve) Token ok: data recovered and Core.request.token assigned');
                } else {
                    if(Bloombees.debug) Core.log.printDebug('Bloombees.checkDSToken(resolve) Token error: deleting local credentials');
                    Core.user.setAuth(false);
                    Core.data.reset();
                    Core.request.token = '';
                }
                resolve();
            });
        } else {
            if(Bloombees.debug) Core.log.printDebug('Bloombees.refreshDSToken(resolve) Core.isAuth() == false, so.. refreshing the token is not needed');
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
        if(Core.url.formParams('bbreferral')!=null) BloombeesMktReceivedParams['bbreferral'] = Core.url.formParams('bbreferral');


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

    // checkMarketingParams to analyze the url and save in cache[BloombeesParams] leaving it info accesible in Bloombees.data.params
    this.checkGeoData = function(resolve) {
        if(Bloombees.debug && !Core.debug) Core.log.printDebug('Bloombees.checkGeoData(resolve) Checking the token in : /data/geo');
        Core.request.call({url:'/data/geo',method:'GET'},function (response) {
            if(response.success) {
                if(Bloombees.debug ) Core.log.printDebug('Bloombees.checkGeoData(resolve) assigning Bloombees.clientCountry='+response.data.COUNTRY);
                Bloombees.clientCountry = response.data.COUNTRY;
            } else {
                Bloombees.error('Bloombees.checkGeoData');
                console.log(response);
            }
            resolve();
        });
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
            var response = {success:false, errors:["Bloombees.signInWithOauthPopUp(social,retUrl,callback) missing social=(facebook|google|instagram)"]};
            if(typeof callback != 'undefined') callback(response);
            return Bloombees.error('Bloombees.signInWithOauthPopUp(social,retUrl,callback) missing callback');
        }

        if((typeof retUrl =='undefined') || !retUrl.indexOf("{id}")  ) {
            var response = {success:false, errors:["Bloombees.signInWithOauthPopUp(social, retUrl,callback) missing a right retUrl included '?oauth_id={id}' substring to subtitute it."]};
            if(typeof callback != 'undefined') callback(response);
            return Bloombees.error('Bloombees.signInWithOauthPopUp(social, retUrl,callback) missing a right retUrl included "?oauth_id={id}" substring to subtitute it.');
        }

        Core.oauthpopup({
            path: Core.config.get('bloombeesOAuthUrl')+'/'+social+'?ret='+retUrl,
            callback: function()
            {
                var oauth_id = Core.cookies.get('oauth_id');
                if(oauth_id) {
                    Core.cookies.remove('oauth_id');
                    Bloombees.signInWithOauthId(oauth_id,function(response) {
                        if(typeof callback != 'undefined') callback(response);
                        else console.log(response);
                    });
                    //do callback stuff
                } else {
                    response = {success:false, errors:["missing cookie 'oauth_id'. Apply in retUrl the JavaScriptCode to save the cookie oauth_signin"]};
                    if(typeof callback != 'undefined') callback(response);
                    else console.log(response);
                }
            }
        });
    };

    // Execute a signin based on a Bloombees oauth id.. It will be used by signInWithOauthPopUp
    this.signInWithOauthId = function(oauth_id,callback) {
        if(Bloombees.debug && !Core.debug) Core.log.printDebug('Bloombees.signInWithOauthId calling: /auth/oauthservice');
        Core.request.call({url:'/auth/oauthservice',params:{id:oauth_id},method:'POST',contentType:'json'},function (response) {
            if(response.success) {
                Core.cookies.set(Bloombees.cookieNameForToken,response.data.dstoken);
                if(Core.user.setAuth(true)) {
                    Core.request.token = Core.user.getCookieValue();
                    Core.user.add(response.data);
                    if(Bloombees.debug && !Core.debug) Core.log.printDebug('Bloombees.signInWithOauthId added user info: '+JSON.stringify(response.data));
                } else {
                    Bloombees.error('Bloombees.signInWithOauthId','Error in Core.user.setAuth(true)');
                }
            }else {
                Bloombees.error('Bloombees.oauth',response);
            }
            callback(response);
        });
    }

    // Login with userpassword
    this.signInWithUserPassword = function(data,callback) {
        if(Bloombees.debug && !Core.debug) Core.log.printDebug('Bloombees.login calling: /auth/userpassword');
        Core.request.call({url:'/auth/userpassword',params:data,method:'POST',contentType:'json'},function (response) {
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

    // It opens a popup calling https://bloombees.com/h/service/oauth/{social}?ret=retUrl. The implementation of the retUrl
    this.signUpWithOauthPopUp = function (social, retUrl,callback) {

        if((typeof social =='undefined') ) {
            var response = {success:false, errors:["Bloombees.signUpWithOauthPopUp(social,retUrl,callback) missing social=(facebook|google|instagram)"]};
            if(typeof callback != 'undefined') callback(response);
            return Bloombees.error('Bloombees.signInWithOauth(social,retUrl,callback) missing callback');
        }

        if((typeof retUrl =='undefined') || !retUrl.indexOf("{id}")  ) {
            var response = {success:false, errors:["Bloombees.signUpWithOauthPopUp(social, retUrl,callback) missing a right retUrl included '?oauth_id={id}' substring to subtitute it."]};
            if(typeof callback != 'undefined') callback(response);
            return Bloombees.error('Bloombees.signUpWithOauthPopUp(social, retUrl,callback) missing a right retUrl included "?oauth_id={id}" substring to subtitute it.');
        }

        Core.oauthpopup({
            path: Core.config.get('bloombeesOAuthUrl')+'/'+social+'?ret='+retUrl,
            callback: function()
            {
                var oauth_id = Core.cookies.get('oauth_id');
                var oauth_emailRequired = Core.cookies.get('oauth_emailRequired');
                Core.cookies.remove('oauth_id');
                Core.cookies.remove('oauth_emailRequired');
                // The front end has received the id and stored in cookies.
                if(oauth_id) {
                    if(oauth_emailRequired) {
                        response = {success:false, oauth_id: oauth_id ,status:4000, errors:["missing email in the social network. Ask for email and call XXXXX: "]};
                        if(typeof callback != 'undefined') callback(response);
                        else console.log(response);
                    } else {
                        Bloombees.signUpWithOauthId(oauth_id, null, function (response) {
                            if (typeof callback != 'undefined') callback(response);
                            else console.log(response);
                        });
                    }
                    //do callback stuff
                } else {
                    response = {success:false, status:5030, errors:["missing cookie 'oauth_id'. Apply in retUrl the JavaScriptCode to save the cookie oauth_signin"]};
                    if(typeof callback != 'undefined') callback(response);
                    else console.log(response);
                }
            }
        });
    };

    // Execute an oauth based on a Bloombees oauth id.. It will be used by signInWithOauthPopUp
    this.signUpWithOauthId = function(oauth_id,email,callback) {

        var params = {id:oauth_id,User_language:Bloombees.lang,dstoken:1};
        if(email != null && typeof email =="string")
            params['User_email'] = email;

        // Add tracking codes if those not exist: source, referrer, campaign
        if(typeof Bloombees.data['params']['source']!='undefined')
            params['source'] = Bloombees.data['params']['source'];
        if(typeof Bloombees.data['params']['referrer']!='undefined')
            params['referrer'] = Bloombees.data['params']['referrer'];
        if(typeof Bloombees.data['params']['campaign']!='undefined')
            params['campaign'] = Bloombees.data['params']['campaign'];
        if(typeof Bloombees.data['params']['bbreferral']!='undefined')
            params['bbreferral'] = Bloombees.data['params']['bbreferral'];

        if(Bloombees.debug && !Core.debug) Core.log.printDebug('Bloombees.oauth calling: /auth/oauthservice');
        Core.request.call({url:'/register/user/oauthservice',params:params,method:'POST',contentType:'json'},function (response) {
            if(response.success) {
                Core.cookies.set(Bloombees.cookieNameForToken,response.data.dstoken);
                if(Core.user.setAuth(true)) {
                    Core.request.token = Core.user.getCookieValue();
                    Core.user.add(response.data);
                    if(Bloombees.debug && !Core.debug) Core.log.printDebug('Bloombees.signUpWithOauthId added user info: '+JSON.stringify(response.data));
                } else {
                    Bloombees.error('Bloombees.oauth','Error in Core.user.setAuth(true)');
                }
            }else {
                Bloombees.error('Bloombees.oauth',response);
            }
            callback(response);
        });
    }

    // Login with userpassword
    this.signUpWithUserPassword = function(data,callback) {
        if(Bloombees.debug && !Core.debug) Core.log.printDebug('Bloombees.signUp calling: /register/user');

        // Add tracking codes if those not exist: source, referrer, campaign
        if(typeof data['source']=='undefined' && typeof Bloombees.data['params']['source']!='undefined')
            data['source'] = Bloombees.data['params']['source'];
        if(typeof data['referrer']=='undefined' && typeof Bloombees.data['params']['referrer']!='undefined')
            data['referrer'] = Bloombees.data['params']['referrer'];
        if(typeof data['campaign']=='undefined' && typeof Bloombees.data['params']['campaign']!='undefined')
            data['campaign'] = Bloombees.data['params']['campaign'];
        if(typeof Bloombees.data['params']['bbreferral']!='undefined')
            params['bbreferral'] = Bloombees.data['params']['bbreferral'];

        Core.request.call({url:'/register/user',params:data,method:'POST',contentType:'json'},function (response) {
            if(Core.user.isAuth()) Core.user.setAuth(false);
            if(response.success) {
                if(typeof response.data.dstoken!='undefined') {
                    Core.cookies.set(Bloombees.cookieNameForToken,response.data.dstoken);
                    if(Core.user.setAuth(true)) {
                        Core.request.token = Core.user.getCookieValue();
                        Core.user.add(response.data);
                        if(Bloombees.debug && !Core.debug) Core.log.printDebug('Bloombees.signUpWithUserPassword added user info: '+JSON.stringify(response.data));
                    } else {
                        Bloombees.error('Bloombees.signUpWithUserPassword','Error in Core.user.setAuth(true)');
                    }
                }
            } else {
                Bloombees.error('Bloombees.signUpWithUserPassword',response);
            }
            callback(response);
        });
    }

    // SignUp a store
    this.signUpStore = function(data,callback) {
        if(!Core.user.isAuth()) {
            Bloombees.error('Bloombees.signUpStore you are not authenticated');
        }

        if(null !== Core.user.get('Store_uniqueId')) {
            Bloombees.error('Bloombees.signUpStore the user has already a store created: '+Core.user.get('Store_id')+' - '+Core.user.get('Store_uniqueId'));
        }
        if(Bloombees.debug && !Core.debug) Core.log.printDebug('Bloombees.signUpStore calling: /register/store/{User_id}');

        // Add tracking codes if those not exist: source, referrer, campaign
        if(typeof data['source']=='undefined' && typeof Bloombees.data['params']['source']!='undefined')
            data['source'] = Bloombees.data['params']['source'];
        if(typeof data['referrer']=='undefined' && typeof Bloombees.data['params']['referrer']!='undefined')
            data['referrer'] = Bloombees.data['params']['referrer'];
        if(typeof data['campaign']=='undefined' && typeof Bloombees.data['params']['campaign']!='undefined')
            data['campaign'] = Bloombees.data['params']['campaign'];
        if(typeof Bloombees.data['params']['bbreferral']!='undefined')
            params['bbreferral'] = Bloombees.data['params']['bbreferral'];

        Core.request.call({url:'/register/store/'+Core.user.get('User_id'),params:data,method:'POST',contentType:'json'},function (response) {
            if(response.success) {
                Core.request.call({url:'/auth/check/dstoken?refresh',method:'GET'},function (responseds) {
                    if(responseds.success) {
                        Core.user.add(responseds.data);
                    } else {
                        Bloombees.error('Bloombees.signUpPromoter calling to /auth/check/dstoken?refresh',responseds);
                    }
                    callback(response);
                });
            } else {
                Bloombees.error('Bloombees.signUpStore',response);
                callback(response);
            }
        });
    }

    // SignUp a promoter
    this.signUpPromoter = function(data,callback) {

        if(!Core.user.isAuth()) {
            Bloombees.error('Bloombees.signUpPromoter you are not authenticated');
        }
        if(null !== Core.user.get('Store_id')) {
            Bloombees.error('Bloombees.signUpPromoter the user has already a store created: '+Core.user.get('Store_id'));
        }
        if(Bloombees.debug && !Core.debug) Core.log.printDebug('Bloombees.signUpPromoter calling: /register/beeviral/{User_id}');

        // Add tracking codes if those not exist: source, referrer, campaign
        if(typeof data['source']=='undefined' && typeof Bloombees.data['params']['source']!='undefined')
            data['source'] = Bloombees.data['params']['source'];
        if(typeof data['referrer']=='undefined' && typeof Bloombees.data['params']['referrer']!='undefined')
            data['referrer'] = Bloombees.data['params']['referrer'];
        if(typeof data['campaign']=='undefined' && typeof Bloombees.data['params']['campaign']!='undefined')
            data['campaign'] = Bloombees.data['params']['campaign'];
        if(typeof Bloombees.data['params']['bbreferral']!='undefined')
            params['bbreferral'] = Bloombees.data['params']['bbreferral'];


        Core.request.call({url:'/register/beeviral/'+Core.user.get('User_id'),params:data,method:'POST',contentType:'json'},function (response) {
            if(response.success) {
                Core.request.call({url:'/auth/check/dstoken?refresh',method:'GET'},function (responseds) {
                    if(responseds.success) {
                        Core.user.add(responseds.data);
                    } else {
                        Bloombees.error('Bloombees.signUpPromoter calling to /auth/check/dstoken?refresh',responseds);
                    }
                    callback(response);
                });
            } else {
                Bloombees.error('Bloombees.signUpPromoter',response);
                callback(response);
            }

        });
    }

    // SignUp a referrer
    this.signUpReferrer = function(data,callback) {

        if(!Core.user.isAuth()) {
            Bloombees.error('Bloombees.signUpReferrer you are not authenticated');
        }
        if(null !== Core.user.get('Store_id')) {
            Bloombees.error('Bloombees.signUpReferrer the user has already a store created: '+Core.user.get('Store_id'));
        }
        if(Bloombees.debug && !Core.debug) Core.log.printDebug('Bloombees.signUpReferrer calling: /register/referrer/{User_id}');

        // Add tracking codes if those not exist: source, referrer, campaign
        if(typeof data['source']=='undefined' && typeof Bloombees.data['params']['source']!='undefined')
            data['source'] = Bloombees.data['params']['source'];
        if(typeof data['referrer']=='undefined' && typeof Bloombees.data['params']['referrer']!='undefined')
            data['referrer'] = Bloombees.data['params']['referrer'];
        if(typeof data['campaign']=='undefined' && typeof Bloombees.data['params']['campaign']!='undefined')
            data['campaign'] = Bloombees.data['params']['campaign'];
        if(typeof Bloombees.data['params']['bbreferral']!='undefined')
            params['bbreferral'] = Bloombees.data['params']['bbreferral'];


        Core.request.call({url:'/register/referrer/'+Core.user.get('User_id'),params:data,method:'POST',contentType:'json'},function (response) {
            if(response.success) {
                Core.request.call({url:'/auth/check/dstoken?refresh',method:'GET'},function (responseds) {
                    if(responseds.success) {
                        Core.user.add(responseds.data);
                    } else {
                        Bloombees.error('Bloombees.signUpReferrer calling to /auth/check/dstoken?refresh',responseds);
                    }
                    callback(response);
                });
            } else {
                Bloombees.error('Bloombees.signUpReferrer',response);
                callback(response);
            }

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

    // Confirm the email passing: User_id and User_emailConfirmationHash
    this.confirmEmail = function(data,callback) {
        if(Bloombees.debug && !Core.debug) Core.log.printDebug('Bloombees.confirmEmail calling: /auth/confirm');
        Core.request.call({url:'/auth/confirm',params:data,method:'POST',contentType:'json'},function (response) {
            if(response.success) {
                if(Bloombees.debug && !Core.debug) Core.log.printDebug('Bloombees.confirmEmail confirmed for user. Info: '+JSON.stringify(response.data));
            } else {
                Bloombees.error('Bloombees.confirmEmail',response);
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

        if(typeof callback != 'function') {
            callback = function(response) {
                console.log(response);
            };
        }

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

        Core.request.call({url:'/socialnetworks/connections/'+Core.user.get('User_id')+'/oauthservice',params:{id:oauth_id},method:'POST',contentType:'json'},function (response) {
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
        Core.request.call({url:'/forms/callmenow',method:'POST',params:data,contentType:'json'},function (response) {
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

    // Prepare the upload of a file. logo:image of the store, products: images for one product, picture: image for the user
    this.getLinkToUploadImages = function(type,callback) {
        var url = '';
        switch(type) {
            case 'signuplogo':
                if(Bloombees.debug && !Core.debug) Core.log.printDebug('Bloombees.getLinkToUploadFiles calling: /upload/users/{user_id}/logo');
                url = '/upload/users/'+Core.user.get('User_id')+'/logo';
                break;
            case 'logo':
                if(!Bloombees.isAuth()) {
                    callback({success:false,errors:["to upload a logo, it requires to be authenticated"]});
                    return Bloombees.error("to upload a logo, it requires to be authenticated");
                }
                if(!Core.user.get('Store_id')) {
                    callback({success:false,errors:["to upload product images, it requires to be a promoter or a seller"]});
                    return Bloombees.error("to upload product images, it requires to be a promoter or a seller");
                }
                // It requires auth
                if(Bloombees.debug && !Core.debug) Core.log.printDebug('Bloombees.getLinkToUploadFiles calling: /upload/stores/{store_id}/logo');
                url = '/upload/stores/'+Core.user.get('Store_id')+'/logo';

                break;
            case 'product':
                if(!Bloombees.isAuth()) {
                    callback({success:false,errors:["to upload product images, it requires to be authenticated"]});
                    return Bloombees.error("to upload product images, it requires to be authenticated");
                }
                if(!Core.user.get('Store_id')) {
                    callback({success:false,errors:["to upload product images, it requires to be a promoter or a seller"]});
                    return Bloombees.error("to upload product images, it requires to be a promoter or a seller");
                }
                if(Bloombees.debug && !Core.debug) Core.log.printDebug('Bloombees.getLinkToUploadFiles calling: /upload/stores/{store_id}/products');
                url = '/upload/stores/'+Core.user.get('Store_id')+'/products';

                break;
            case 'picture':
                if(!Bloombees.isAuth()) {
                    callback({success:false,errors:["to upload user picture, it requires to be authenticated"]});
                    return Bloombees.error("to upload user picture, it requires to be authenticated");
                }
                if(Bloombees.debug && !Core.debug) Core.log.printDebug('Bloombees.getLinkToUploadFiles calling: /upload/users/{user_id}/image');
                url = '/upload/users/'+Core.user.get('User_id')+'/image';
                break;
            default:
                callback({success:false,errors:["wrong type. Use getLinkToUploadImages('(logo|product|picture)'])"]});
                return Bloombees.error("wrong type. Use getLinkToUploadImages('(logo|product|picture)'])");
                break;
        }

        Core.request.call({url:url,method:'GET',credentials:'include'},function (response) {
            callback(response);
        });
    }

    this.uploadImage = function(type,field,callback) {

        // Processing the info from uploadImage
        var info = Core.fileInput(field);
        if(info.error) return(Core.error.add(info.errorMsg));
        else {
            console.log(info);
            if (typeof info=='undefined'  || typeof info.files=='undefined' ||  typeof info.files[0].type=='undefined' || info.files[0].type.indexOf('image/') != 0) {
                callback({success:false,errors:["you only can upload images"]});
                return Bloombees.error("You can only upload images");
            }
        }

        // Evaluate the different types and status of the user
        switch(type) {
            case 'signuplogo':
                break;
            case 'logo':
                if(!Bloombees.isAuth()) {
                    callback({success:false,errors:["to upload a logo, it requires to be authenticated"]});
                    return Bloombees.error("Bloombees.uploadFile upload a logo requires to be authenticated");
                }
                if(!Core.user.get('Store_id')) {
                    callback({success:false,errors:["to upload product images, it requires to be a promoter or a seller"]});
                    return Bloombees.error("Bloombees.uploadFile upload product images require to be a promoter or a seller");
                }
                break;
            case 'product':
                if(!Bloombees.isAuth()) {
                    callback({success:false,errors:["to upload product images, it requires to be authenticated"]});
                    return Bloombees.error("Bloombees.uploadFile upload product images requires to be authenticated");
                }
                if(!Core.user.get('Store_id')) {
                    callback({success:false,errors:["to upload product images, it requires to be a promoter or a seller"]});
                    return Bloombees.error("Bloombees.uploadFile upload product images requires to be a promoter or a seller");
                }
                break;
            case 'picture':
                if(!Bloombees.isAuth()) {
                    callback({success:false,errors:["to upload user picture, it requires to be authenticated"]});
                    return Bloombees.error("Bloombees.uploadFile upload user picture requires to be authenticated");
                }
                break;
            default:
                callback({success:false,errors:["wrong type. Use getLinkToUploadImages('(logo|product|picture)'])"]});
                return Bloombees.error("wrong type. Use getLinkToUploadImages('(logo|product|picture)'])");
                break;
        }

        // Get the link to upload a file
        Bloombees.getLinkToUploadImages(type,function(response) {
            if (response.success) {
                var url = response.data.uploadUrl;
                console.log(url,info.params);
                Core.request.call({method:'POST',url:url,credentials:'include',params:info.params},function(response) {
                    callback(response);
                });
            } else {
                console.log(response);
                callback(response);
            }
        });
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

    this.checkPasswordRecovery = function(id,callback) {

        if(typeof id != 'string') {
            Bloombees.error('Bloombees.checkPasswordRecovery','email is not a string.');
            callback({success:false,error:['Bloombees.sendPasswordRecovery','email is not a string.']});
            return;
        }

        Core.request.call({url:'/auth/newpassword',method:'GET',params:{id:id}},function (response) {
            callback(response);
        });
    }

    this.updatePasswordRecovery = function(data,callback) {

        Core.request.call({url:'/auth/newpassword',method:'PUT',contentType:'json',params:data},function (response) {
            callback(response);
        });
    }

    this.generatePasswordRecovery = function(email,callback) {

        if(typeof email != 'string') {
            Bloombees.error('Bloombees.generatePasswordRecovery','email is not a string.');
            callback({success:false,error:['Bloombees.generatePasswordRecovery','email is not a string.']});
            return;
        }

        Core.request.call({url:'/auth/newpassword',method:'POST',params:{User_email:email}},function (response) {
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