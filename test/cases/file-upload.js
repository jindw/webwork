
var multiparty = require('multiparty');
var after = require('after');
var Webwork = require('webwork')
  , request_ = require('supertest')
  , assert = require('assert')
  , methods = (require('methods'),'get|post|put|patch|delete'.split('|'));
function request(app){
    return request_(app instanceof Function?app:app.receiver)
}
if(typeof describe == 'undefined'){
     var app = new Webwork();

      app.get('*',function*(req, res){
      res.writeHead(200,{'Content-Type':'text/html'})
        res.end(`<form enctype=multipart/form-data method=post>

<input type=file name="aaa"/>
<input type=file name="aaa"/>
<input type=file name="aaa"/>
<input type=file name="aaa"/>
<input type=file name="aaa"/>
<input type=file name="aaa"/>
<input type=file name="aaa"/>
<input type=submit name="aaa"/>

        </form>
        `)
      })
      app.post('*',function*(req, res){
        var body = yield req.body;
        console.log(body+'')
        console.log(req.headers)

        res.end(body.name);
      });
    app.start(8080)
}else{
    describe('app upload test', function(){
        it('print infos', function(done){

          var app = new Webwork();



          app.post('*',function*(req, res){
            var body = yield req.body;
            console.log('body:',body)
            console.log('headers:',req.headers);


            var form = new multiparty.Form();
            var formData = new Promise(function(a,r){
                form.parse(req,function(err,fields,files){
                    if(err){
                        r(err);
                    }else{
                        a(fields);
                    }
                })
            })
            var body2 = yield formData;
            console.log('body2:',body2)

            res.end(body2.name[0]);
          });
          request(app)
          .post('/')
          .field("name",'test multiparty1 ')
          //.send()
          .expect('test multiparty1 ', done);
        })


    })
}