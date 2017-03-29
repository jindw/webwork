var app = new (require('koa'))();
var router = require('koa-router')();



//var app = require('../lib/app.js');
app.use(async function (ctx,next){
	//console.log(arguments,req+'',resp+'')
	//console.log(yield 111);
	await next();
});
app.use(async function(ctx,next){
	//console.log(arguments,req+'',resp+'')
	//console.log(yield new Promise(function(r){setTimeout(r,100)}));
	//next(req,resp);
	await next();
});
app.use(async function(ctx,next){
	//console.log(arguments,req+'',resp+'')
	//console.log(yield 333);
	//return ('test.xhtml');
	await next();
});

app.use(async function(ctx,next){
	//console.log(arguments,req+'',resp+'')
	//console.log(yield 444);
	//return ('test.xhtml');
	await next();
});


router.get('/:ns?/html/:method',async function (ctx,resp){
var model = {}
    model.title="测试:"+ctx .url;
    //console.log(model)
    this.body = JSON.stringify(model)
    //console.log('!!!!!',this.a)
    //ctx.end('123')
    //return true;

})

router.get('/:ns?/service/:method',function(req,resp){
var model = {}
    model.title="测试:"+ctx .url;
    console.log(model)
    ctx.body = JSON.stringify(model)

})

var LiteEngine = require('lite');
//console.log(__dirname)


/*
var engine = new LiteEngine(__dirname);
app.resolveView('*.xhtml',engine.render.bind(engine))
app.bind('/:ns?/html/:method').get(function * (req,resp){
    this.title="测试:"+req.url;

router.all('/abcd:test/t(/a\\da/)?',async function(){
	console.log(`value:${this.value};values:${this.values}; query:${JSON.stringify(this.query)}`)
	for(var n in this){
		//console.log('this.',n,this[n])
	}
	var req = this.req;
	var Writable = require('stream').Writable
	
	
    Object.defineProperty(req,'body',{get:parseBody})
    console.log(String(await req.body))
	var v = '111 111 11111 11 11111 1=1=1\n中文1=1\n 11111 11111 111 111 11111';
	v = v.split('').join(v);
	
	this.body = ('<form method=post enctype="text/plain" onsubmit=\'var i=0;for(var n of this.x) n.value='+JSON.stringify(v)+'+i++;return confirm()\'>hello world\n<input type=submit name=xxx ' +
			' value=submit>'+
	v.replace(/./g,'<input type=hidden name=x>')
	+'</form>'+Object.keys(this))
})*/

function parseBody(){
	let req = this;
	let transferEncoding =  req.headers['transfer-encoding'] ;
    let contentLength = req.headers['content-length']
    if(!transferEncoding && isNaN(contentLength)){//no body
    	return null
    }
	return new Promise(function(resolve,reject){
		let chunks = []
		let received = 0
		let events = {
			data(chunk){chunks.push(chunk);received+=chunk.length;},
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
		switch(contentType.replace(/.*(\bjson)$|application\/x\-www\-form\-(urlencoded)/,'$1$2')){
		case 'json':return JSON.parse(String(buf));
		case 'urlencoded':return buildQuery(String(buf));
		default:return buf;
		}
	})
}
app.use(router.routes())
app.listen(8081);