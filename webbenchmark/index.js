const CREATE = 500000;
const ECS = require('../src/index');

const descriptions = {
  create2Comp: 'Create 50,000 entities with two simple components',
  destroy2Comp: 'Destroy 50,000 entities with two simple components'
}

const times = {
  create2Comp: 0,
  destroy2Comp: 0
};

function output(test) {

  console.log(`${descriptions[test]}: ${(times[test]).toFixed(2)}ms`);
}

function benchmarks() {
  let start, end;


  const ecs = new ECS.World();
  ecs.registerComponent('Test', {
    properties: {
      a: 1,
      b: 2
    }
  });
  ecs.registerComponent('Test2', {
    properties: {
      c: 3,
      d: 4
    }
  });

  const entities = [];

  console.log(`Creating and destroying ${CREATE} entities...`);

  start = performance.now();

  for (let i = 0; i < CREATE; i++) {

    entities.push(
      ecs.createEntity({
        Test: {
          a: 4,
          b: 5
        },
        Test2: {
          c: 6,
          d: 7
        }
      })
    );
  }
  end = performance.now();
  times.create2Comp = end - start;
  output('create2Comp');

  start = performance.now();

  for (let i = 0; i < CREATE; i++) {
    entities[i].destroy();
  }

  end = performance.now();
  times.destroy2Comp = end - start;
  output('destroy2Comp');

}

function tick() {

  benchmarks();
  console.log(times);
  setTimeout(tick, 3000);
}

tick();


