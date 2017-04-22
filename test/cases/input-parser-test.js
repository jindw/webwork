var net = require('net')
var after = require('after');
var Webwork = require('webwork')
  , request_ = require('supertest')
  , assert = require('assert')
  , methods = (require('methods'),'get|post|put|patch|delete'.split('|'));
function request(app){
    return request_(app instanceof Function?app:app.receiver)
}
describe('input parser test', function(){
    it('should check req.body', function(done){

      var app = new Webwork();

      app.post('*',function*(req, res){
        var body = yield req.body;
        console.log(JSON.stringify(body))

        res.end(body.name);
      });
      request(app)
      .post('/')
      .send({ name: 'test post ' })
      .expect('test post ', done);
    })

    it('should check req.value', function(done){

      var app = new Webwork();

       app.post('*',function*(req, res){
        var value = yield req.value;
        var body = yield req.body;
        console.log('value:',value)
        console.log('body:',body)
        console.log(JSON.stringify(value))

        res.end(value.name);
      });
      request(app)
      .post('/')
      .send({ name: 'test post value ' })
      .expect('test post value ', done);
    })
})

describe('app request body chunks',function(){
    it('test one chunk',function(done){
        var app = new Webwork();

        var testData = JSON.stringify({data:123,list:[1,2,4]})+'\r\n    \r\n'
        app.post('*',function*(req, res){
            var value = yield req.body;
            var v = JSON.stringify(value)
            res.end(value.name);
            app.stop();

            if(v != JSON.stringify(JSON.parse(testData))){
                //console.log(assert)
                //assert.equal(v.length,testData.length)
                //assert.equal(v,testData)
                done('content modified!!')
            }else{
                done();
            }
        });
        app.start(8087)
        var socket = net.connect(8087, 'localhost', function () {
            socket.write('POST / HTTP/1.1\r\n');
            socket.write('Host: localhost\r\n');
            socket.write('Connection: close\r\n');
            socket.write('Content-Type: application/json\r\n');
            socket.write('Transfer-Encoding: chunked\r\n');
            socket.write('\r\n');
            var d1 = testData;
            socket.write(d1.length.toString(16)+'\r\n');
            socket.write(d1);
            socket.write('\r\n');

            socket.write('0\r\n\r\n');
            socket.on('close', function () {
                //app.server.close(done);
            });
        });

    })
    it('test more chunk',function(done){
        var app = new Webwork();
        var testData = JSON.stringify({data:123,list:[1,socket+'',arguments.callee],text:"dfogqh;wsfuqwyueyiuwqjedoecagdjmaczchnXSLsoqiugxvadsjkmaskjshdasqs. mvndqw,sx"})
                        //+'\r\n    \r\n'
        app.post('*',function*(req, res){
            var body = yield req.body;
            var v = (JSON.stringify(body))
            res.end(v);
            app.stop();
            if(v != testData){
                //console.log(assert)
                //assert.equal(v.length,testData.length)
                //assert.equal(v,testData)
                done('content modified!!')
            }else{
                done();
            }
        });
        app.start(8087)
        var socket = net.connect(8087, 'localhost', function () {
            socket.write('POST / HTTP/1.1\r\n');
            socket.write('Host: localhost\r\n');
            socket.write('Connection: close\r\n');
            socket.write('Content-Type: application/json\r\n');
            socket.write('Transfer-Encoding: chunked\r\n');
            socket.write('\r\n');
            var d = testData;
            var ds = [];
            while(d.length>5){
                var l1 = d.length *Math.random() | 0;
                ds.push(d.substr(0,l1||1));
                d = d.substr(l1||1);
            }
            ds.push(d);
            console.log(ds.join('\r\n#'))
            for(var d of ds){
                socket.write(d.length.toString(16)+'\r\n');
                socket.write(d);
                socket.write('\r\n');
            }

            socket.write('0\r\n\r\n');
            socket.on('close', function () {
                //app.server.close(done);
            });
        });

    })
    it('test more packed chunk',function(done){
        var app = new Webwork();
        var testData = JSON.stringify({data:123,list:[1,socket+'',arguments.callee],text:"dfogqh;wsfuqwyueyiuwqjedoecagdjmaczchnXSLsoqiugxvadsjkmaskjshdasqs. mvndqw,sx"})
                        //+'\r\n    \r\n'
        app.post('*',function*(req, res){
            var body = yield req.body;
            var v = (JSON.stringify(body))
            res.end(v);
             app.stop();
            if(v != testData){
                done('content modified!!')
            }else{
                done();
            }
        });
        app.start(8087)
        var socket = net.connect(8087, 'localhost', function () {
            socket.write('POST / HTTP/1.1\r\n');
            socket.write('Host: localhost\r\n');
            socket.write('Connection: close\r\n');
            socket.write('Content-Type: application/json\r\n');
            socket.write('Transfer-Encoding: chunked\r\n');
            socket.write('\r\n');
            var d = testData;
            var ds = [];
            while(d.length>5){
                var l1 = d.length *Math.random() | 0;
                ds.push(d.substr(0,l1||1));
                d = d.substr(l1||1);
            }
            ds.push(d);
            console.log(ds.join('\r\n#'))
            var buf = [];
            for(var d of ds){
                buf.push(d.length.toString(16)+'\r\n');
                buf.push(d);
                buf.push('\r\n');
            }
            socket.write(buf.join(''))

            socket.write('0\r\n\r\n');
            socket.on('close', function () {
                //app.server.close(done);
            });
        });

    })

})