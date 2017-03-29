module.exports = function(req){
    let path = req.url;
    let queryIndex = path.indexOf('?')
    if(queryIndex>=0){
        req.query = buildQuery(path.substr(queryIndex+1))
        path = path.substr(0,queryIndex)
    }else{
        req.query = {};
    }
    Object.defineProperty(req,'body',bodyProperty)
    Object.defineProperty(req,'cookie',cookieProperty)
    return path;
}
const cookieProperty = buildProperty('_cookie',parseCookie)
const bodyProperty =  buildProperty('_body',parseBody);
function buildProperty(key,parse){
	return {get:function(){
		key in this?this[key]:this[key]=parse(this)
	},set:function(value){
		this[key] = value
	}};
}
function safeDecode(v){
	try{return decodeURIComponent(v)}catch(e){return v;}
}
function parseBody(req){
    let transferEncoding =  req.headers['transfer-encoding'] ;
    let contentLength = req.headers['content-length']
    if(transferEncoding || !isNaN(contentLength)){//has body http://www.w3.org/Protocols/rfc2616/rfc2616-sec4.html#sec4.3
        return new Promise(function(resolve,reject){
            let chunks = []
            let received = 0
            let events = {
                data(chunk){
                	chunks.push(chunk);
                	received+=chunk.length;
                	if(received>MAX_BODY_LEN){
                		return 
                	}
                },
                end(){clean()},
                close(){clean('closed')},
                error(e){clean(e||'error')}
            }
            for(var n in events){
                 req.on(n, events[n])
            }
            function clean(err){
                if(events){
                    for(var n in events){
                        req.removeListener(n, events[n])
                    }
                    events = null;
                    err?reject(err):resolve(chunks.length==1?chunks[0]:Buffer.concat(chunks))
                }
            }
        }).then(function(buf){
            let contentType = (req.headers['content-type'] || '').toLowerCase();
            switch(contentType.replace(/.*(\bjson)$|.*\/x\-www\-form\-(urlencoded)/,'$1$2')){
            case 'json':return JSON.parse(String(buf));
            case 'urlencoded':return buildQuery(String(buf));
            default:return buf;
            }
        })
    }
}
function buildQuery(search){
    let query =  {};
    search.replace(/([^=&]+)=([^&]+)/g,function(a,key,value){
        key = safeDecode(key);
        value = safeDecode(value);
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
function parseCookie(req){
	let cookie = req.headers.cookie || '';
    let values =  {};
    cookie.replace(/([^=]+)=([^;]*)/g,function(a,key,value){
        key = safeDecode(key.replace(/^\s+|\s+$/g,''));
        value = safeDecode(value.replace(/^\s+|\s+$/g,''));
        if(key in values){
           // query[key] = value;
        }else{
            values[key] = value;
        }
        return '';
    })
    return values;
}