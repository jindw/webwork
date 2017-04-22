const Writable = require('stream').Writable;
const buildProperty = (key,parse)=>({
              get(){
                  return this[key] || (key in this?this[key]:this[key]=parse(this))
              },
              set(value){this[key] = value}
      	});

const cookieProperty = buildProperty('_cookie',parseCookie)
const bodyProperty =  buildProperty('_body',parseBody);
const valueProperty =  buildProperty('_value',parseValue);
const BODY_DEFAULT_MAX_LEN = 1024*1024*5;
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


function parseValue(req){
    let value = copy(req.query,{});
    let params = req.params;
    return req.body?
        req.body.then(body=>copy(params, copy(body,value))):
        Promise.resolve(copy(params,value));
}
function parseBody(req){//http://www.w3.org/Protocols/rfc2616/rfc2616-sec4.html#sec4.3
    let transferEncoding =  req.headers['transfer-encoding'];
    let encoding = (req.headers['content-encoding'] || 'identity').toLowerCase()
    let contentType = (req.headers['content-type'] || '').toLowerCase();
    let contentLength = +req.headers['content-length']
    if(encoding =='identity'
        && !contentType.startsWith('multipart/form-data')
        && (contentLength<BODY_DEFAULT_MAX_LEN || transferEncoding)){//transferEncoding : chunk   stream pipe implemented
        let [,type,encoding] = contentType.match(/^\w+\/(json|x\-www\-form\-urlencoded)(?:;\s*charset=([\w\-]+))?$/)||[];
        let buf = read(req, contentLength,encoding,req.maxLength || BODY_DEFAULT_MAX_LEN);/// application/json application/x-www-form-urlencoded
        return type? buf.then(buf=>type=='json'?JSON.parse(buf||'{}'):buildQuery(buf)):buf;
    }
}
function read(input,contentLength,encoding,maxLength){//chunk not support,read by 3rd libs
    return new Promise(function(resolve,reject){
        let chunks = [];
        let received = 0
        let proxy = new Writable({//
            write(chunk, encoding, callback) {
                chunks.push(chunk);
                received+=chunk.length;
                if(received>=maxLength){
                    clean(received == maxLength?'':'bytes received exceeds the limit:'+received +'>' +maxLength)
                }
                callback();
            },decodeStrings:true
        })
        let events = {
            end(){clean(received==contentLength || !contentLength?'':'bytes received('+received+') not matched Content-Length:'+contentLength)},
            close(){clean('closed')},
            error(e){clean(e||'error')}
        }
        input.pipe(proxy);
        for(var n in events){
             input.on(n, events[n])
        }
        function clean(err){
            if(events){
                for(var n in events){
                    input.removeListener(n, events[n])
                }
                events = null;
                input.unpipe(proxy);
                err?reject(err):resolve((chunks.length==1?chunks[0]:Buffer.concat(chunks)).toString(encoding))
            }
        }
    });
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
//
//function read2(input,maxLength){//chunk not support,read by 3rd libs
//    return new Promise(function(resolve,reject){
//        let chunks = []
//        let received = 0
//        let events = {
//            data(chunk){
//                chunks.push(chunk);
//            },
//            end(){clean()},
//            close(){clean('closed')},
//            error(e){clean(e||'error')}
//        }
//        for(var n in events){
//             input.on(n, events[n])
//        }
//        function clean(err){
//            if(events){
//                for(var n in events){
//                    input.removeListener(n, events[n])
//                }
//                events = null;
//                err?reject(err):resolve(chunks.length==1?chunks[0]:Buffer.concat(chunks))
//            }
//        }
//    })
//}