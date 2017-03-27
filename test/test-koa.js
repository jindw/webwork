var app = new (require('koa'))();
var router = require('koa-router')();

router.get('/abcd:test/t(/a\\da/)?',function(){
	console.log(this.value,this.values)
	console.log(this.query)
	this.body = ('hello world\n'+Object.keys(this))
})

app.use(router.routes())
app.listen(8081);