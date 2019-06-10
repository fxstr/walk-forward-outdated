import test from 'ava';
import Requirer from './requirer';
import Dep from './dependency'; //import sinon from 'sinon';

test('1', t => {
  console.log('Dep', Dep, Dep.default); //const A = { run: function() { return 'okay' } };

  /*const mock = sinon.mock(Dep.default)
  	.expects('run')
  	.once()
  	.returns('nööö');*/
  //const mock = sinon.stub(Dep.default, 'run').callsFake(() => 'okeee');

  let called = 0;

  Dep.prototype.run = function () {
    console.log('called');
    called++;
    return 'yep';
  }; //
  //console.log('mock', mock);
  //t.is(req.run(), 'original dependency');


  const req = new Requirer();
  const runned = req.run();
  console.log('runned', runned); //t.is(mock.verify(), true);

  t.is(runned, 'yep');
  t.is(called, 1); //mock.restore();
});
//# sourceMappingURL=requirer.test.js.map