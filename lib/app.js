'use strict';
const Router = require('./router')
const setupRequest = require('./input-parser')
class App{
    constructor(prefix){
        let app = this;
        this.routes = [[],[],{}];
        this.filters = [];
        this.views = [];
        this.prefix = prefix || '';
        this.receiver = (req,resp,next)=>doAccept(app,req,resp,next)
    }
    start(port,callback){
        this.server = this.server || require('http').createServer(this.receiver);
        this.server.setTimeout(this.timeout || 1000*30)
        this.server.listen(port||8080,callback);
        return this;
    }
    stop(cb){
        this.server && this.server.close(cb);
    }
    intercept(filter,index){
        let end = this.filters.length;
        this.filters.splice(index == null?end:(index|0)%end,0,toAsync(filter));
        return this;
    }
    resolveView(pattern,callback){
        let router = new Router(pattern);
        router.callback = toAsync(callback);
        this.views.push(router);
        return this;
    }
    bind(path,callbacks){
        if(callbacks instanceof Function){
            this.any(path,callbacks)
        }else if(callbacks){
            for(var n in callbacks){
                if(callbacks[n] instanceof Function){
                    this[n](path,callbacks[n])
                }
            }
        }
        return this;
    }
    unbind(path){
        let list = this.routes;
        let routeIndex = list[0].indexOf(String(path));
        if(routeIndex >=0){
            list[0].splice(routeIndex,1)
            return list[1].splice(routeIndex,1)
        }
    }
}
class Binder{
    constructor(app,config){
        let path = config.path || config;
        let routes = app.routes;
        let routeIndex = routes[0].indexOf(String(path));
        if(routeIndex >=0){
            return app.routes[1][routeIndex];
        }else {
            routes[0].push(String(path));
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
'bind|unbind|start|intercept|resolveView'.split('|').map(n => App[n] = ()=>defaultApp[n].apply(defaultApp,arguments))
'any|get|post|update:put|patch|del:delete'.split('|').map(function(methodName){
    let httpMethod = methodName.replace(/^\w+\:/,'');
    methodName = methodName.replace(/\:\w+$/,'');
    App[methodName] = (path,callback) => defaultApp[methodName](path,callback);
    App.prototype[methodName] = function(path,callback){
        //if(path instanceof Function){var tmp = path;path = callback;callback=tmp;}
        if(path instanceof Array){
            for(var tmp of path){this[methodName](tmp,callback)}
        }else{
            callback = toAsync(callback)
            let binder = new Binder(this,path)
            binder.action[httpMethod] = callback;
        }
        return this;
    }
    if(methodName != httpMethod){
        App[httpMethod] = App[methodName];
        App.prototype[httpMethod] = App.prototype[methodName];
    }
});
function doAccept(app,req,resp,next){
    let prefix = app.prefix;
    let path =req.url
    if(!prefix || path.startsWith(prefix)){
        path = setupRequest(req, prefix ? path.substr(prefix.length) : path);
        let list = app.routes[1];
        let len = list.length;
        let action = req.method.toLowerCase();
        let startIndex = 0;
        while(startIndex<len){
            let binder = list[startIndex++];
            let params =  binder.router.match(path);
            if(params){
                req.params = params;
                let impl = binder.action[action]||binder.action.any||(()=>Promise.resolve(405));//405:,'Method Not Allowed'
                return doFilter(app,req,resp,impl,binder.config[action]||{})
            }
        }
    }
    return next && next() || doFilter(app,req,resp,()=>Promise.resolve(404),{})//405:,'No Matched Router'
}
function doFilter(app,req,resp,impl,config){
    let filters = app.filters;
    let len = filters.length;
    let proxyHandler = config && config.modelHandler;
    let model = proxyHandler?new Proxy({},proxyHandler):{};
    let result = innerNext(req,resp,0);
    function innerNext(req,resp,chainDepth){
        if(chainDepth<len){
            let filter = filters[chainDepth];
            return filter.call(model,req,resp,
                ()=>innerNext(req,resp,chainDepth+1),
                config);
        }
        return impl.call(model,req,resp);
    }
    return result.then(
            value=>resp.finished || doResolveViewModel(app,req,resp,value,model),
            error=>{
                let msg = error.stack||error
                resp.writeHead(500,{'Content-Type':'text/plain;charset=utf-8'})
                resp.end(String(msg))
                console.error(msg);
            });
}
function doResolveViewModel(app,req,resp,view,model){
    if(typeof view == 'number'){
        resp.writeHead(view,{'Content-Type':'text/plain;charset=utf-8'})
        if(view == 404){
            let body = `Request Resource Not Found:${req.url+'\n'}Available Routers List:${'\n\t'+app.routes[0].join('\n\t')}`;
            return resp.end(body) || body.length;
        }//else : http status and json model stringify
    }else if(view){
        for(let viewRouter of  app.views){
             if(viewRouter.match(view)){
                return viewRouter.callback(view,model,req,resp);
             }
        }
        console.error('view not found!!'+view);
    }else{
        resp.writeHead(200,{"Content-Type":'application/json;charset=utf-8'})//default json stringify model
    }
    return toAsync(function *(model){
               for(let n in model){
                   model[n] = yield model[n];
               }
               return resp.end(model= JSON.stringify(model))||model.length;;
           })(model);
}
function toAsync(fn){
    return fn instanceof AsyncFunction? fn:doWrap(fn)
}
function doWrap(fn){
    function asyncWrapper(...args){//GeneratorFunction &&  Function
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
    asyncWrapper.toString = ()=>'toAsync('+fn+')';
    return asyncWrapper;
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
App.receiver = defaultApp.receiver;
module.exports = App;