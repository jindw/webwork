var app = new (require('koa'))();
var router = require('koa-router')();

router.get('/+/abcd:test/*/t:test3(\\d*)',function(){
	console.log(this.param,this.params)
	console.log(this.query)
	this.body = ('hello world\n'+Object.keys(this))
})

app.use(router.routes())
app.listen(8081);