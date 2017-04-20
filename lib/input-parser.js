const buildProperty = (key,parse)=>({
              get(){
                  return this[key] || (key in this?this[key]:this[key]=parse(this))
              },
              set(value){this[key] = value}
      	});
const cookieProperty = buildProperty('_cookie',parseCookie)
const bodyProperty =  buildProperty('_body',parseBody);
const valueProperty =  buildProperty('_value',parseValue);
const MAX_BODY_LEN = 1024*1024*5;
exports = module.exports = function(req){
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
    Object.defineProperty(req,'value',valueProperty)
    return path;
}
function parseBody(req){
    let transferEncoding =  req.headers['transfer-encoding'] ;
    let contentLength = req.headers['content-length']
    if(transferEncoding || !isNaN(contentLength)){//has body http://www.w3.org/Protocols/rfc2616/rfc2616-sec4.html#sec4.3
        let contentType = (req.headers['content-type'] || '').toLowerCase();
        let [,type,encoding] = contentType.match(/.*\b(?:json|x\-www\-form\-urlencoded)(?:;\s*charset=([\w\-]+))?$/)||[];
        return read(req,contentLength,transferEncoding).then(
                buf=> type=='json'?JSON.parse(buf.toString(encoding)):type=='x-www-form-urlencoded'?buildQuery(buf.toString(encoding)):buf
            )
    }
}
function parseCookie(req){
	let cookie = req.headers.cookie || '';
    let values =  {};
    cookie.replace(/([^=]+)=([^;]*)/g,(a,key,value)=>(values[safeDecode(key.trim())] = safeDecode(value)))
    return values;
}
function safeDecode(v){
	try{return v && decodeURIComponent(v)}catch(e){return v;}
}
function copy(s,t){
    for(let n in s){t[n] = s[n];}
    return t;
}
function parseValue(req){
    let value = copy(req.query,{});
    let params = req.params;
    return req.body?
        req.body.then(body=>copy(params, copy(body,value))):
        Promise.resolve(copy(params,value));
}
function read(input,maxLength){//chunk not support
    return new Promise(function(resolve,reject){
        let chunks = []
        let received = 0
        let events = {
            data(chunk){
                chunks.push(chunk);
                received+=chunk.length;
                if(received>=maxLength){
                    clean(received == maxLength?'':'bytes received exceeds the limit ')
                }
            },
            end(){clean()},
            close(){clean('closed')},
            error(e){clean(e||'error')}
        }
        for(var n in events){
             input.on(n, events[n])
        }
        function clean(err){
            if(events){
                for(var n in events){
                    input.removeListener(n, events[n])
                }
                events = null;
                err?reject(err):resolve(chunks.length==1?chunks[0]:Buffer.concat(chunks))
            }
        }
    })
}
function buildQuery(search){
    let query =  {};
    search.replace(/([^=&]+)=([^&]*)/g,(a,key,value)=>{
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