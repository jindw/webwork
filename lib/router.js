'use strict';
class Router{
	constructor(path){
		this.path = path;
		this.keys = [];
		this.regexp = Router.pathToRegExp(path,this.keys);
	}
	match(path){
		var m = String(path).match(this.regexp);
		if(m){
			var values = m.slice(1);
			var params = {};
			var keys = this.keys;
			var i = keys.length;
			while(i--){
				params[keys[i]] = values[i]
			}
			return params;
		}
	}
    static pathToRegExp(path, keys) {
        keys = keys || []
        var exp = /\:(\w+)|(\*)/;
        var inc = 0;
        var m;
        var tokens =[];
        while(m = exp.exec(path)){
            //console.log(m)
            var paramName = m[1];
            var star = m[2];
            var index = m.index;
            tokens.push(escapeExp(path.substr(0,index)));
            path = path.substr(index+m[0].length)
            if(star){
                keys.push(inc++);
                tokens.push('(.*)');
            }else{
                var nextChar = path.charAt() ;
                var pattern = null
                if(nextChar== '('){
                    var i = 1;
                    while((i = path.indexOf(')',i)+1)>0){
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
                }
                if(!pattern){
                    pattern = '([^/]+?)'
                }
                if(nextChar.match(/[*?+]/)){
                    pattern+=nextChar;
                    path = path.substr(1)
                }
                keys.push(paramName);
                tokens.push(pattern);
            }
        }
        tokens.push(path)
        return new RegExp('^' + tokens.join('') + '$');
    }
}
function escapeExp(chars){
	return chars.replace(/([\/\-\[\]\\$*.?])|[^\w]/g,function(c,g1){
		return g1 ? '\\'+g1 : '\\u'+(c.charCodeAt()+0x10000).toString(16).slice(-4);
	})
}
module.exports =  Router;