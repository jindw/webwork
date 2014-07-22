'use strict';

class Router{
	constructor(path){
		this.path = path;
		this.keys = [];
		this.regexp = Router.pathToRegExp(path,this.keys);
	}
	match(url){
		var m = url.match(this.regexp);
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
        var leftPath = path;
        var exp = /\:(\w+)|(\*)/;
        var inc = 0;
        var m;
        var tokens =[];
        //console.log(path)
        while(m = exp.exec(leftPath)){
            //console.log(m)
            var paramName = m[1];
            var star = m[2];
            var index = m.index;
            tokens.push(escapeExp(leftPath.substr(0,index)));
            leftPath = leftPath.substr(index+m[0].length)
            if(star){
                keys.push(inc++);
                tokens.push('(.*)');
            }else{
                var nextChar = leftPath.charAt() ;
                var pattern = null
                if(nextChar== '('){
                    var i = 1;
                    while(true){
                        i = leftPath.indexOf(')',i)+1;
                        if(i>0){
                            try{
                                new RegExp(leftPath.substr(0,i));
                                pattern = leftPath.substr(0,i);
                                leftPath = leftPath.substr(i) ;
                                nextChar = leftPath.charAt() ;
                                break;
                            }catch(e){
                                continue;
                            }
                        }
                    }
                    if(!pattern){
                        console.error('invalid router pattern:'+leftPath)
                    }
                }
                if(!pattern){
                    pattern = '([^/]+?)'
                }
                if(nextChar.match(/[*?+]/)){
                    pattern+=nextChar;
                    leftPath = leftPath.substr(1)
                }
                keys.push(paramName);
                tokens.push(pattern);
            }
        }
        tokens.push(leftPath)
        return new RegExp('^' + tokens.join('') + '$');
    }
}
function escapeExp(chars){
	return chars.replace(/[^\w]/g,function(c){
		if(c == '/'){
			return '\\/';
		}else{
			return '\\u'+(c.charCodeAt()+0x10000).toString(16).slice(-4);
		}
	})
}

module.exports =  Router;