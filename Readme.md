## Installation

Simplicity is the ultimate sophistication.

* Less dependence(no any external dependence)
* Less code(about 400 line pure javascript code)
* High performance(5k+ tps on one core)
* Perfect foundation support
  * full express style router
  * default query body(post) parser
  * webwork(java) style interceptor
  * **Automatic bigpiple optimization support**

## How To Use

####install
---
```
$ npm install webwork
```

####hello world
---
```js
//use shared webwork instance and bind any http method to any url
require('webwork').bind('/*',function(req,resp){
	resp.end('Hello WebWork');
}).start(8080)
```
####Full Examples
---
```js
//new webwork instance
const WW = require('webwork');
const app = new WW();

//bind default view resolver
let LiteEngine = require('lite');
let engine = new LiteEngine('./');
app.resolveView('*.xhtml',engine.render.bind(engine))

//bind a resource as restfull api
app.bind('/resource/:id').get(function(req,resp){ //http get
   const id = req.params.id;
   this.title = 'Hello Webwork';
   this.content = 'resource id:'+id;
   //no output(resp.end), no view is  returned,
   //automatically encoded as json format 
}).post(async function(req,resp){ //async function is recommended at all times;
   var body = await req.body;	    //create: http post
   this.id = createXXX.....
   //json output
}).del(function *(req,resp){		 //delete: http delete
    const id = req.params.id;
	this.status = deleteXXX.....
});

//bind get http method for any other url and use template: '/success.xhtml'
app.bind('*').get(function(req,resp){
  this.title = 'Hello Webwork';
  this.content = 'url path:'+req.params[0];
  return '/success.xhtml'
});

app.start();

```

###Use Template
#####lite template is recomanded
---
* auto bigpiple support
* auto bigrender support
* and others....

```javascript
let LiteEngine = require('lite');
let engine = new LiteEngine('./');
app.resolveView('*.xhtml',engine.render.bind(engine))
```
#####for others
---
```
const path = require('path');
const jade = require('jade');
const jadeRoot = './jade/';
app.resolveView('*.xhtml',function*(viewPath,model,req,out){
	for(var n in model){
		model[n] = yield model[n];
	}
	// renderFile 
	const tplFile = path.join(jadeRoot,viewPath);
	const html = jade.renderFile(tplFile, model);
	out.end(html)
})
```

