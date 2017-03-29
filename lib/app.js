'use strict';
const Router = require('./router')
const setupRequest = require('./input-parser')
class App{
    constructor(prefix){
        this.routes = [[],[],{}];
        this.filters = [];
        this.views = [];
        this.prefix = prefix || '';
    }
    start(port,callback){
        let app = this;
        function receive(req,resp){
            doAccept(app,req,resp)
        }
        this.server = require('http').createServer(receive);
        this.server.setTimeout(app.timeout || 1000*30)
        this.server.listen(port||8080,callback);
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
    resolveView(pattern,callback){
        let router = new Router(pattern);
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
    static resolveView(pattern,callback){
        return defaultApp.resolveView(pattern,callback)
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
    let path =req.url
    if(prefix){
        if(!path.startsWith(prefix))return;
        path = path.substr(prefix.length)
    }
    path = setupRequest(req, path);
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
function doFilter(app,req,resp,impl,config){
    let filters = app.filters;
    let len = filters.length;
    let proxyHandler = config && config.modelHandler;
    let model = proxyHandler?new Proxy({},proxyHandler):{};
    let chainDepth = 0
    let result = innerNext(req,resp,0);
    function innerNext(req,resp){
        if(chainDepth<len){
            let filter = filters[chainDepth++];
            return filter.call(model,req,resp,
                //function(){ return innerNext(req,resp,chainDepth+1)}
                innerNext
                    ,config);
        }
        return impl instanceof Function ? impl.call(model,req,resp):impl;
    }
    return result.then(function(value){
            return doResolveViewModel(app,req,resp,value,model)
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
          return resp.end(`Request Resource Not Found:${req.url+'\n'}Available Routers List:${'\n\t'+app.routes[0].map(JSON.stringify).join('\n\t')}`);
        }else{
          return resp.end(JSON.stringify(model))
        }
    }else if(view){
        for(let viewRouter of  app.views){
             if(viewRouter.match(view)){
                return viewRouter.callback(view,model,req,resp);
             }
        }
    }
    return resp.finished || resolvePromiseMap(model).then(function(){//json data output
        resp.writeHead(200,{"Content-Type":'text/json;charset=utf-8'})
        resp.end(JSON.stringify(model));
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
function toAsync(fn){
    return fn instanceof AsyncFunction? fn: function(...args){//GeneratorFunction &&  Function
        try{
            var result = fn.apply(this,args);
        }catch(e){
            return Promise.reject(e)
        }
        if(fn instanceof GeneratorFunction){
            return iteratorToPromise(result)
        }else{
            return result instanceof Promise?result:Promise.resolve(result)
        }
    }
}
function iteratorToPromise(result){
    return new Promise(function(resolve,reject){
        onThen();
        function onError(e){
            try{
                onNext(result.throw(e));
            }catch(e){
                return reject(e)
            }
        }
        function onThen(value){
            try{
                onNext(result.next(value))
            }catch(e){
                return reject(e)
            }
        }
        function onNext(it){
            while(!it.done){
                let value = it.value;
                if(value instanceof Promise){
                    return value.then(onThen,onError);
                }else{
                    it = result.next(value);
                }
            }
            resolve(it.value);
        }
    })
}
const GeneratorFunction = new Function('return (function *(){}).constructor')()
const AsyncFunction = new Function("try{return new Function('return (async function(){}).constructor')()}catch(e){}")()||iteratorToPromise
const defaultApp = new App();
module.exports = App;