var app = require('webwork');

app.intercept(function *(req,resp,next){
	//console.log(arguments,req+'',resp+'')
	//console.log(yield 111);
	//console.log(req.method)
	return next(req,resp);
});
app.intercept(function *(req,resp,next){
	//console.log(arguments,req+'',resp+'')
	//console.log(yield new Promise(function(r){setTimeout(r,100)}));
	//next(req,resp);
	return next(req,resp);
});
app.intercept(function *(req,resp,next){
	//console.log(arguments,req+'',resp+'')
	//console.log(yield 333);
	//return ('test.xhtml');
	return next(req,resp);
});

app.intercept(function *(req,resp,next){
	//console.log(arguments,req+'',resp+'')
	//console.log(yield 444);
	//return ('test.xhtml');

	//require('fs').createReadStream('test/test-koa.js').pipe(resp)
	//return new Promise(function(resolve){resp.on('end',resolve);})
	return next(req,resp);
});

var LiteEngine = require('lite');
//console.log(__dirname)

var engine = new LiteEngine(__dirname);
app.resolveView('*.xhtml',engine.render.bind(engine))
app.bind('/:ns?/html/:method').post(function * (req,resp){
    this.title="测试:"+req.url;
    console.log('!!!!!',yield req.body)
    resp.end('123')
    return;
/*
    this.description = new Promise(function(resolve,reject){
        setTimeout(function(){
            resolve("异步获取的详细描述信息")
        },100)
    })
    //等待10毫秒
    var lazyData = yield new Promise(function(resolve,reject){
                               setTimeout(function(){
                                   resolve("等待一段时间才能执行后面的代码...");
                               },10)
                           })

    this.data = {
        params:req.params,
        list : ['item1','item2','item3']
    }

    var promiseMap = {description:this.description};
    for(var n in promiseMap){
        promiseMap[n] = yield promiseMap[n];
    }
	return 'test.xhtml'*/
})
app.bind('/:ns?/service/:method').get(function(req,resp){
      this.title="测试:"+req.url;
      this.data = {
           params:req.params,
           list : ['item1','item2','item3']
      }
  })
app.start();


