var app = require('../lib/app.js');
app.intercept(function(req,resp,next){
	next(req,resp);
});

var LiteEngine = require('lite');
console.log(__dirname)
var engine = new LiteEngine(__dirname);
app.resolveView('*.xhtml',engine.render.bind(engine))

app.bind('/:ns?/html/:method').get(function * (req,resp){
    this.title="测试:"+req.url;

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
	return 'test.xhtml'
})
app.bind('/:ns?/service/:method').get(function(req,resp){
      this.title="测试:"+req.url;
      this.data = {
           params:req.params,
           list : ['item1','item2','item3']
      }
  })
app.start();


