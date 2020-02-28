const { expect } = require('@hapi/code');
const Lab = require('@hapi/lab');
const lab = exports.lab = Lab.script();

const ECS = require('../src/index');

lab.experiment('System.query', () => {

  const ecs = new ECS.ECS();
  ecs.registerComponent('Health', {
    properties: {
      max: 25,
      hp: 25,
      armor: 0
    }
  });

  lab.before(({ context }) => {

  });

  lab.test('has', () => {

    ecs.createEntity({
      Health: [ { hp: 10 } ]
    });

    const results = ecs.queryEntities({ has: ['Health'] });

    expect(results.size).to.equal(1);
  });

});
