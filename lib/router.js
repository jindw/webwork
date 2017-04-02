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
            var m = String(path).match(this.regexp);
            if(m){
                var values = m.slice(1);
                var params = {};
                var keys = this.keys;
                var i = keys.length;
                while(i--){
                    params[keys[i]] = values[i] && decodeURIComponent(values[i])
                }
                return params;
            }
		}catch(e){}
	}
    static pathToRegExp(path, keys) {
        keys = keys || []
        if(path instanceof RegExp){
            path.source.replace(/[^()]/g,function(){keys.push(keys.length)});
            return path;
        //}else if(path instanceof Array){
        //    path = path.join('|')
        }
        let tokens =[];
        let exp = /\:(\w+)|(\*)|\\(.)|(\()/;
        let inc = 0;
        let m;
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
                        paramName = inc++;
                    }
                }
                if(!pattern){
                    pattern = '([^/]+)'
                }
                if(nextChar == '?'){
                    pattern+=nextChar;
                    path = path.substr(1)
                }
                keys.push(paramName);
                tokens.push(pattern);
            }
        }
        tokens.push(path)
        return new RegExp('^(?:' + tokens.join('') + ')$');
    }
}
function escapeExp(chars){
	return chars.replace(/([\/\-\[\]\\$*.?])|[^\w|]/g,function(c,g1){
		return g1 ? '\\'+g1 : '\\u'+(c.charCodeAt()+0x10000).toString(16).slice(-4);
	})
}
module.exports =  Router;