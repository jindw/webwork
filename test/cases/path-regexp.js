const assert = require('assert')
const Router = require('webwork/lib/router')

describe('path to regexp', function(){
    it('check ?', function(){
        var regexp = Router.pathToRegExp('/user(s)?/:user/:op');
        console.log(regexp)
        assert.deepEqual(['s','u1','op1'],regexp.exec('/users/u1/op1').slice(1))
        assert.deepEqual([undefined,'u1','op1'],regexp.exec('/user/u1/op1').slice(1))
    });
    it('check \\()',function(){
        //console.log()
        var regexp = Router.pathToRegExp('/:user\\(:op\\)')
        console.log(regexp)
        assert.deepEqual(['u1','op1'],regexp.exec('/u1(op1)').slice(1))
    })
})