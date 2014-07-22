## Installation

```
$ npm install webwork
```

## Hello webwork

```js
//use shared webwork instance and bind any http method to any url
require('webwork').bind('/*',function(req,resp){
	resp.end('Hello webwork');
}).start(8080)
```

```js
//new webwork instance
const webwork = require('webwork');
const app = new webwork();

//bind default view resolver
var LiteEngine = require('lite');
var engine = new LiteEngine('./');
app.resolveView('*.xhtml',engine.render.bind(engine))

//bind get http method for any url and output model as json
app.bind('/resource/:id').get(function(req,resp){
  this.title = 'Hello Webwork';
  this.body = 'resource id:'+req.params.id;
});

//bind get http method for any other url and use template: 'success.xhtml'
app.bind('*').get(function(req,resp){
  this.title = 'Hello Webwork';
  this.body = 'url path:'+req.params[0];
  return '/success.xhtml'
});

app.start();

```

