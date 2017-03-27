'use strict';
const Router = require('./router')
class App{
    constructor(prefix){
        this.routes = [[],[]];
        this.filters = [];
        this.views = [];
        this.prefix = prefix || '';
    }
    start(port){
        let app = this;
        function receive(req,resp){
            doAccept(app,req,resp)
        }
        this.server = require('http').createServer(receive);
        this.server.setTimeout(app.timeout || 1000*30)
        this.server.listen(port||8080);
        return this;
    }
    bind(path,callbacks){
        let binder = new Binder(this,path)
        this.currentBinder = binder;
        if(callbacks instanceof Function){
            this.any(callbacks)
        }else if(callbacks){
            for(var n in callbacks){
                if(callbacks[n] instanceof Function){
                    this[n](callbacks[n])
                }
            }
        }
        return this;
    }
    unbind(path){
        let list = this.routes;
        let routeIndex = list[0].indexOf(path);
        if(routeIndex >=0){
            list[0].splice(routeIndex,1)
            list[1].splice(routeIndex,1)
        }
        return this;
    }
    intercept(filter){
        this.filters.push(toAsync(filter));
        return this;
    }
    resolveView(pattern,callback,waitPromise){
        let router = new Router(pattern);
        router.waitPromise = waitPromise;
        router.callback = toAsync(callback);
        this.views.push(router);
        return this;
    }
    static bind(path,callbacks){
        return defaultApp.bind(path,callbacks)
    }
    static unbind(path){
        return defaultApp.unbind(path)
    }
    static start(port){
        return defaultApp.start(port);
    }
    static intercept(callback){
        return defaultApp.intercept(callback)
    }
    static resolveView(pattern,callback,waitPromise){
        return defaultApp.resolveView(pattern,callback,waitPromise)
    }
}
class Binder{
    constructor(app,config){
        let path = config.path || config;
        let routes = app.routes;
        let routeIndex = routes[0].indexOf(path);
        if(routeIndex >=0){
            return app.routes[1][routeIndex];
        }else {
            routes[0].push(path);
            routes[1].push(this);
        }
        this.app = app;
        this.config = config.path && config || {};
        this.action = {};
        this.router = new Router(path);
        this.path = path;
    }
}
/* app util functions */
'any|get|post|update:put|patch|del:delete'.split('|').map(function(methodName){
    let httpMethod = methodName.replace(/^\w+\:/,'');
    methodName = methodName.replace(/\:\w+$/,'');
    App[methodName] = function(callback,path){
        defaultApp[methodName](callback,path)
    }
    App.prototype[methodName] = function(callback,path){
        callback = toAsync(callback)
        if(path){
            let backupBinder = this.currentBinder;
            this.bind(path)
            this.currentBinder.action[httpMethod] = callback
            this.currentBinder = backupBinder;
        }else{
            this.currentBinder.action[httpMethod] = callback
        }
        return this;
    }
    if(methodName != httpMethod){
        App[httpMethod] = App[methodName];
        App.prototype[httpMethod] = App.prototype[methodName];
    }
});
function doAccept(app,req,resp){
    let prefix = app.prefix;
    let path = req.url;
    let queryIndex = path.indexOf('?')
    if(queryIndex>=0){
        req.query = buildQuery(path.substr(queryIndex+1))
        path = path.substr(0,queryIndex)
    }else{
        req.query = {};
    }
    if(!prefix || !path.indexOf(prefix)){
        path = prefix ? path.substring(prefix.length) : path
        let list = app.routes[1];
        let len = list.length;
        let action = req.method.toLowerCase();
        let startIndex = 0;
        while(startIndex<len){
            let binder = list[startIndex++];
            let params =  binder.router.match(path);
            if(params){
                req.params = params;
                let impl = binder.action[action]||binder.action.any;
                return doFilter(app,req,resp,impl||405,binder.config[action]||{})//405:,'Method Not Allowed'
            }
        }
        return doFilter(app,req,resp,404,{})//405:,'No Matched Router'
    }
}
function doFilter(app,req,resp,impl,config){
    let list = app.filters;
    let len = list.length;
    let startIndex = 0;
    let proxyHandler = config && config.modelHandler;
    let model = proxyHandler?new Proxy({},proxyHandler):{};
    let result = function innerNext(req,resp){
        while(startIndex<len){
            let filter = list[startIndex++];
            return filter.call(model,req,resp,innerNext,config);
        }
        return impl instanceof Function ? impl.call(model,req,resp):impl;
    }(req,resp);
    return (result instanceof Promise?result:Promise.resolve(result)).then(function(value){
            doResolveViewModel(app,req,resp,value,model)
        }).catch(function(error){
            let msg = error.stack||error
            console.error(msg);
            resp.writeHead(500,{'Content-Type':'text/plain;charset=utf-8'})
            resp.end(String(msg))
        });
}
function doResolveViewModel(app,req,resp,view,model){
    if(typeof view == 'number'){
        resp.writeHead(view,{'Content-Type':'text/plain;charset=utf-8'})
        if(view == 404){
          resp.end(`Request Resource Not Found:${req.url+'\n'}Available Routers List:${'\n\t'+app.routes[0].map(JSON.stringify).join('\n\t')}`);
        }else{
          resp.end(JSON.stringify(model))
        }
    }else if(view){
        for(let viewRouter of  app.views){
             if(viewRouter.match(view)){
                return new Promise(function(resolve){
                     resp.on('finish',function(e){resolve(resp)})
                     if(viewRouter.waitPromise){
                        return resolvePromiseMap(model).then(function(model){
                            return viewRouter.callback(view,model,req,resp);
                        })
                     }else{
                        return viewRouter.callback(view,model,req,resp);
                     }
                 })
             }
        }
    }
    return resolvePromiseMap(model).then(function(){//json data output
        resp.writeHead(200,{"Content-Type":'text/json;charset=utf-8'})
        resp.end(JSON.stringify(model));
        return resp;
    });
}
function resolvePromiseMap(model){
    return toAsync(function *(){
        for(let n in model){
            model[n] = yield model[n];
        }
        return model;
    })()
}
function buildQuery(search){
    let query =  {};
    search.replace(/([^=&]+)=([^&]+)/g,function(a,key,value){
        key = decodeURIComponent(key);
        value = decodeURIComponent(value);
        if(key in query){
            let oldValue = query[key];
            if(oldValue instanceof Array){
                oldValue.push(value)
            }else{
                query[key] = [oldValue,value];
            }
        }else{
            query[key] = value;
        }
        return '';
    })
    return query;
}
function toAsync(fn){
    return fn instanceof GeneratorFunction? function(){
        var result = fn.apply(this,arguments);
        return new Promise(function(resolve,reject){
            function onError(e){
                try{
                    result.throw(e);
                }catch(e){
                    reject(e)
                }
            }
            function onNext(value){
                try{
                    let next = result.next(value);
                    value = next.value;
                    while(!next.done){
                        if(value instanceof Promise){
                            return value.then(onNext,onError);
                        }else{
                            next = result.next(next.value);
                            value = next.value;
                        }
                    }
                    resolve(value);
                }catch(e){
                    reject(e)
                }
            }
            onNext();
        })
    }:fn;
}
const GeneratorFunction = new Function('return (function *(){}).constructor')()
const defaultApp = new App();
module.exports = App;