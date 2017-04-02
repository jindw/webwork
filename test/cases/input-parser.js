
var after = require('after');
var Webwork = require('webwork')
  , request_ = require('supertest')
  , assert = require('assert')
  , methods = (require('methods'),'get|post|put|patch|delete'.split('|'));
function request(app){
    return request_(app instanceof Function?app:app.receiver)
}
describe('app input getter', function(){
    it('should check req.body', function(done){

      var app = new Webwork();

      app.bind('*').post(function*(req, res){
        var body = yield req.body;

        res.end(body.name);
      });
      request(app)
      .post('/')
      .send({ name: 'test post ' })
      .expect('test post ', done);
    })

    it('should check req.body', function(done){

      var app = new Webwork();

      app.bind('*').post(function*(req, res){
        var value = yield req.value;

        res.end(value.name);
      });
      request(app)
      .post('/')
      .send({ name: 'test post ' })
      .expect('test post ', done);
    })
})