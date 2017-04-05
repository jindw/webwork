
var after = require('after');
var Webwork = require('webwork')
  , request_ = require('supertest')
  , assert = require('assert')
  , methods = (require('methods'),'get|post|put|patch|delete'.split('|'));
function request(app){
    return request_(app instanceof Function?app:app.receiver)
}


describe('query parser',function(){
    it('muti query', function(done){
      var app = Webwork.get('/foo', function(req, res){
        console.log(req.query)
        res.end(JSON.stringify(req.query))
      });

      Webwork.resolveView('*',function(){})
      request(app)
      .get('/foo?a=1&a=2&a=3')
      .expect('{"a":["1","2","3"]}', function(args){
        done(args);
      })
    })
})

describe('',function(){

  describe('when next() is called', function(){
    it('should continue lookup', function(done){
      var app = new Webwork()
        , calls = [];

      app.intercept( function(req, res, next){
        calls.push('/foo/:bar?');
        next();
      });

      app.get('/foo',function(req, res){
        assert(0);
      });

      app.get('/foo',function(req, res, next){
        calls.push('/foo');

      });

      app.get('/foo2', function(req, res, next){
        calls.push('/foo 2');
        res.end('done');
      });

      request(app)
      .get('/foo')
      .expect('done', function(){
        assert.deepEqual(calls,['/foo/:bar?', '/foo']);
        done();
      })
    })
  })

  describe('when next("route") is called', function(){
    it('should jump to next route', function(done){
      var app = new Webwork()

      function fn(req, res, next){
        res.setHeader('X-Hit', '1')
        next('route')
      }

      app.intercept(fn);
      app.get('/foo', fn, function(req, res, next){
        res.end('failure')
      });

      app.get('/foo', function(req, res){
        res.end('success')
      })

      request(app)
      .get('/foo')
      .expect('X-Hit', '1')
      .expect(200, 'success', done)
    })
  })

  describe('when next("router") is called', function () {
    it('should jump out of router', function (done) {
      var app = new Webwork()
      var router = app;//express.Router()


      router.intercept(function fn (req, res, next) {
            res.setHeader('X-Hit', '1')
            next('router')
        });

      router.get('/foo',  function (req, res, next) {
        res.end('failure')
      })

      router.get('/foo', function (req, res, next) {
        res.end('failure')
      })

      //app.use(router)

      app.get('/foo', function (req, res) {
        res.end('success')
      })

      request(app)
      .get('/foo')
      .expect('X-Hit', '1')
      .expect(200, 'success', done)
    })
  })
  it('should run in order added', function(done){
    var app = new Webwork();
    var path = [];

    app.intercept( function(req, res, next){
      path.push(0);
      return next();
    });

    app.intercept(function(req, res, next){
      path.push(1);
      return next();
    });

    app.intercept(function *(req, res, next){
       yield new Promise(function(a){setTimeout(a,10)})
      path.push(2);
      return next();
    });

    app.intercept( function(req, res, next){
      path.push(3);
      return next();
    });

    app.intercept( function(req, res, next){
      path.push(4);
      next();
    });

    app.intercept(function(req, res, next){
      path.push(5);
      return res.end(path.join(','))
    });
    app.get('*',function(){})
    request(app)
    .get('/user/1')
    .expect(200, '0,1,2,3,4,5', done);
  })

  it('should be chainable', function(){
    var app = new Webwork();
    assert.deepEqual(app.get('/', function(){}),app);
  })

})
    void('should be optional by default', function(done){
      var app = new Webwork();

      app.get('/user', function(req, res){
        res.end('tj');
      });

      request(app)
      .get('/user/')
      .expect('tj', done);
    })


      void('should pass-though mounted middleware', function(done){
        var app = new Webwork();

        //app.enable('strict routing');

        app.use('/user/', function (req, res, next) {
          res.setHeader('x-middleware', 'true');
          next();
        });

        app.get('/user/test/', function(req, res){
          res.end('tj');
        });

        request(app)
        .get('/user/test/')
        .expect('x-middleware', 'true')
        .expect(200, 'tj', done);
      })

  void('when next(err) is called', function(){
    it('should break out of app.router', function(done){
      var app = new Webwork()
        , calls = [];

      app.get('/foo/:bar?', function(req, res, next){
        calls.push('/foo/:bar?');
        next();
      });

      app.get('/bar', function(req, res){
        assert(0);
      });

      app.get('/foo', function(req, res, next){
        calls.push('/foo');
        next(new Error('fail'));
      });

      app.get('/foo', function(req, res, next){
        assert(0);
      });

      app.intercept(function(err, req, res, next){
        res.end(err.message);
      })

      request(app)
      .get('/foo')
      .expect('fail', function(){
        assert.deepEqual(calls,['/foo/:bar?', '/foo']);
        done();
      })
    })

    void('should call handler in same route, if exists', function(done){
      var app = new Webwork();

      function fn1(req, res, next) {
        next(new Error('boom!'));
      }

      function fn2(req, res, next) {
        res.end('foo here');
      }

      function fn3(err, req, res, next) {
        res.end('route go ' + err.message);
      }

      app.get('/foo', fn1, fn2, fn3);

      app.use(function (err, req, res, next) {
        res.end('error!');
      })

      request(app)
      .get('/foo')
      .expect('route go boom!', done)
    })
  })

  void('should allow rewriting of the url', function(done){
    var app = new Webwork();

    app.get('/account/edit', function(req, res, next){
      req.user = { id: 12 }; // faux authenticated user
      req.url = '/user/' + req.user.id + '/edit';
      next();
    });

    app.get('/user/:id/edit', function(req, res){
      res.end('editing user ' + req.params.id);
    });

    request(app)
    .get('/account/edit')
    .expect('editing user 12', done);
  })