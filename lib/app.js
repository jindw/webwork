'use strict';


class App{
	constructor(prefix){
		this.routeList = [[],[]];
		this.filters = [];
		this.views = [];
		this.prefix = prefix || '';
	}
	bind(path,callbacks){
		let binder = new Binder(this,path)
		this.currentBinder = binder;
		if(callbacks instanceof Function){
			this.any(callbacks)
		}else{
			for(let n in callbacks){
				if(callbacks[n] instanceof Function){
					this[n](callbacks[n])
				}
			}
		}
		return this;
	}
	unbind(path){
		let list = this.routeList;
		let routeIndex = list[0].indexOf(path);
		if(routeIndex >=0){
			list[0].splice(routeIndex,1)
			list[1].splice(routeIndex,1)
		}
		return this;
	}
	intercept(filter){
		this.filters.push(filter);
		return this;
	}
	sendError(req,resp,error,message=""){
	    if(typeof error == 'number'){
	        var code = error;
	    }else{
	        code=500;
	        message = message+ (error &&(error.stack||error));
	    }
        resp.writeHead(code,{'Content-Type':'text/paint;charset=utf-8'})
        resp.end(message)
	}

	resolveView(pattern,callback,waitPromise){
	    let router = new Router(pattern);
	    router.waitPromise = waitPromise;
	    router.callback = callback;
	    this.views.push(router);
	    return this;
	}
	start(port){
		let app = this;
		function callback(req,resp){
		    resp.setTimeout(10000,function(socket,err){
		        app.sendError(req,resp,err,'timeout')
		    })
			doAccept(app,req,resp)
		}
		this.server = require('http').createServer(callback);
		this.server.listen(port||8080);
		return this;
	}

	next(req,resp){
        resp.writeHead(404,{'Content-Type':'text/html'})
		resp.end('Request Resource Not Found:'+req.url+"<hr>Available Routers List:<ul><li>"+this.routeList[0].join('</li><li>')+'</li></ul>');
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
	constructor(app,path){
		let routeList = app.routeList;
		let routeIndex = routeList[0].indexOf(path);
		if(routeIndex >=0){
			return app.routeList[1][routeIndex];
		}else {
			routeList[0].push(path);
			routeList[1].push(this);
		}
		this.router = new Router(path);
		this.app = app;
		this.path = path;
		this.action = {};
	}
}

/* app util functions */
'any|get|post|update:put|patch|del:delete'.split('|').map(function(methodName){
	let httpMethod = methodName.replace(/^\w+\:/,'');
	methodName = methodName.replace(/\:\w+$/,'');
	App[methodName] = function(callback,path2){
		defaultApp[methodName](callback,path2)
	}
	App.prototype[methodName] = function(callback,path2){
		if(path2){
			let currentBinder = this.currentBinder;
			this.bind(path2)
			this.currentBinder.action[httpMethod] = callback
			this.currentBinder = currentBinder;
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
    let url = req.url;
    let prefix = app.prefix;
    let queryIndex = url.indexOf('?')
    if(queryIndex>=0){
        var path = url.substr(0,queryIndex)
        req.query = buildQuery(url.substr(queryIndex+1))
    }else{
        path = url;
        req.query = {};
    }
    if(prefix){
        if(path.indexOf(prefix)){//prefix match failed
            return app.next(req,resp);
        }
        path = path.substring(prefix.length)
    }
    let list = app.routeList[1];
    let len = list.length;
    let action = req.method.toLowerCase();
    let startIndex = 0;
    while(startIndex<len){
        let binder = list[startIndex++];
        let impl = binder.action[action]||binder.action.any;
        let params =  impl && binder.router.match(path);
        if(params){
            req.params = params;
            return doFilter(app,req,resp,impl)
        }
    }
    app.next(req,resp);
}
function doFilter(app,req,resp,impl){
    let list = app.filters;
    let len = list.length;
    let startIndex = 0;
    let model = {};

    //console.log('doFilter',impl)
    function innerNext(req,resp){
        while(startIndex<len){
            let filter = list[startIndex++];
            return filter.call(model,req,resp,innerNext);
        }
        doInvoke(app,req,resp,model,impl);
    }
    innerNext(req,resp);
}
function doInvoke(app,req,resp,model,impl){
    //console.log('doInvoke',model)
    let result = impl.call(model,req,resp);
    if(result instanceof Promise){
        result.then(function(result){
            doResolveViewModel(app,req,resp,result,model)
        },function(error){
            app.sendError(req,resp,error)
        })
    }else{
        if(impl instanceof GeneratorFunction){
            function doCatch(e){
                //console.log('error!!!',e)
                try{
                    result.throw(e);
                }catch(e){
                    app.sendError(req,resp,e)
                }finally{
                    doNext();
                }

            }
            function doNext(value){
                let next = result.next(value);
                value = next.value;
                while(!next.done){
                    //console.log(value)
                    if(value instanceof Promise){
                        value.then(doNext,doCatch);
                        return;
                    }else{
                        next = result.next(next.value);
                        value = next.value;
                    }
                }
                //console.log(value)
                doResolveViewModel(app,req,resp,value,model)
            }
            doNext();
        }else{
            doResolveViewModel(app,req,resp,result,model)
        }
    }
}
function resolvePromise(model){
    let keys = [];
    let values = [];
    for(let n in model){
        let v = model[n];
        if(v instanceof Promise){
            keys.push(n);
            values.push(v);
        }
    }
    //console.info('doResolveViewModel!!'+keys)
    return Promise.all(values).then(function(newValues){
        let i = newValues.length;
        while(i--){
            model[keys[i]] = newValues[i]
        }
        return model;
    });
}
function doResolveViewModel(app,req,resp,view,model){
    let matchRouter;
    if(view){
        for(let router of app.views){
             if(router.match(view)){
                matchRouter = router;
             }
         }
    }
    //console.log('resolve view',view,matchRouter)
    if(matchRouter){
        if(matchRouter.waitPromise){
            resolvePromise(model).then(function(model){
                matchRouter.callback(view,model,req,resp);
            },function(error){
                app.sendError(req,resp,error)
            })
        }else{
            matchRouter.callback(view,model,req,resp);
        }
    }else{
        resolvePromise(model).then(function(){
            resp.writeHead(200,{"Content-Type":'text/json;charset=utf-8'})
            resp.end(JSON.stringify(model))
        },function(error){
             app.sendError(req,resp,error)
         });
    }
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


const Router = require('./router')
const defaultApp = new App();
const GeneratorFunction = new Function('return (function *(){}).constructor')()
module.exports = App;
