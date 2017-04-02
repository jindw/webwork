var app = require('express')();
app.get('/abcd:test/t:test(/\d+/)',function(req,resp){
	console.log(req.value,req.values)
	console.log(req.param,req.params.id,Object.keys(req))
	console.log({
		//next:req.next,
		baseUrl:req.baseUrl,
		_parsedUrl:req._parsedUrl,
		params:req.params,
		query:req.query,
		//res:req.res,
		route:req.route
	})
	console.log(req.param+'')
	resp.end('hello world'+req)
});
app.get('/ns?/:service/:method',function(req,resp){
	resp.end('hello world'+JSON.stringify(req.params)+Date.now());
});
app.listen(8081);