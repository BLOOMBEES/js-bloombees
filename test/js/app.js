PageInterface = new function() {
    var app = this;
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
                Core.bind([app.loadAuth], function () {
                    app.loading(false);
                });
            });
        }
    }


    app.loading = function (state) {
        if(state) {
            $('#loader').show();
            $('#app').hide();
        } else {
            $('#loader').hide();
            $('#app').show();
        }
    }
    app.alertMsg = function (title,msg,type) {
        if(typeof type=='undefined') type = 'type-default';
        BootstrapDialog.show({
            title: title,
            message: msg,
            type: type
        });
    }

    app.loadAuth = function(resolve,reject) {
        if(typeof PageInterface.auth == 'undefined') {
            Core.dynamic.load({
                template:{url:'/js/modules/signin/auth.htm',dom:document.getElementById("external_templates")}
                ,script:{url:'/js/modules/signin/auth.js'}
                },function(){
                if(typeof PageInterface.auth == 'undefined') PageInterface.error('.loadAuth loading modules/signin/auth.js and it does not add PageInterface.auth');
                else
                {
                    try {
                        console.log('loaded modules/signin/auth.js');
                        PageInterface.auth.init(function() {
                            resolve();
                        });
                    } catch (err) {
                        console.log(err);
                        resolve();
                    }
                }
            });
        } else {
            resolve();
        }
    }




    app.error = function (msg) {
        Core.log.print('[PageInterface] '+msg);
    }
};
PageInterface.init();