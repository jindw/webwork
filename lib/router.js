'use strict';
const safeDecode = require('./input-parser').safeDecode
class Router{
	constructor(path){
		this.path = path;
		this.keys = [];
		this.regexp = Router.pathToRegExp(path,this.keys);
	}
	match(path){
	    try{
            let m = String(path).match(this.regexp);
            if(m){
                let values = m.slice(1);
                let params = {};
                let keys = this.keys;
                let i = keys.length;
                while(i--){
                    let value = values[i];
                    if(value != undefined){
                        params[keys[i]] = decodeURIComponent(value)
                    }
                }
                return params;
            }
		}catch(e){}
	}
    static pathToRegExp(path, keys) {
        keys = keys || []
        if(path instanceof RegExp){
            path.source.replace(/\\.|(\()/g,(a,g)=>g && keys.push(keys.length));
            return path;
        }
        let inc = 0,    tokens =[];
        let m,          exp = /\:(\w+)|(\*)|\\(.)|(\()/;
        while(m = exp.exec(path)){
            //console.log(m)
            let paramName = m[1]||'';
            let star = m[2];
            let escape = m[3];
            let bracket = m[4];
            let index = m.index;
            tokens.push(escapeExp(path.substr(0,index)));
            path = path.substr(bracket?index:index+m[0].length)
            if(star){
                keys.push(inc++);
                tokens.push('(.*)');
            }else if(escape){
                tokens.push(escapeExp(escape));
            }else{
                let nextChar = path.charAt() ;
                let pattern = null
                if(nextChar== '('){//maybe a regexp
                    let i = 1;
                    while(i = path.indexOf(')',i)+1){
                        try{
                            new RegExp(path.substr(0,i));
                            pattern = path.substr(0,i);
                            path = path.substr(i) ;
                            nextChar = path.charAt() ;
                            break;
                        }catch(e){
                            continue;
                        }
                    }
                    if(!pattern){
                        console.error('invalid router pattern:'+path)
                    }
                    if(bracket){
                        if(!pattern){
                            tokens.push('\\(');
                            path = path.substr(1);
                            continue;
                        }
                    }
                }
                if(!pattern){
                    pattern = '([^/]+)'
                }
                if(nextChar == '?'){
                    pattern+=nextChar;
                    path = path.substr(1)
                }
                keys.push(paramName || inc++);
                tokens.push(pattern);
            }
        }
        tokens.push(path)
        return new RegExp('^(?:' + tokens.join('') + ')$');
    }
}
const escapeExp = chars => chars.replace(/([\/\-\[\]\\$*.?])|[^\w|]/g, (c,escaped)=> '\\'+ (escaped || (c.charCodeAt()+0x10000).toString(16).replace('1','u')));
module.exports =  Router;