const CREATE = 50000;
const ECS = require('./src/index');
const perf_hooks = require('perf_hooks');

const descriptions = {
  create2Comp: 'Create 50,000 entities with two simple components',
  destroy2Comp: 'Destroy 50,000 entities with two simple components',
  recreating: 'Recreating components now that pool is established',
  rewriteComp: 'Chanigng the values of each component'
}

const times = {
  create2Comp: 0,
  destroy2Comp: 0,
  recreating: 0
};

function output(test) {

  console.log(`${descriptions[test]}: ${(times[test]).toFixed(2)}ms`);
}

function benchmarks() {
  let start, end;


  const ecs = new ECS.World({ trackChanges: false, entityPool: CREATE });
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

  start = perf_hooks.performance.now();

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
  end = perf_hooks.performance.now();
  times.create2Comp = end - start;
  output('create2Comp');

  start = perf_hooks.performance.now();
  for (let i = 0; i < CREATE; i++) {
    entities[i].component.Test.a = 14;
    entities[i].component.Test.b = 15;
    entities[i].component.Test2.c = 16;
    entities[i].component.Test2.d = 17;
  }
  end = perf_hooks.performance.now();
  times.rewriteComp = end - start;
  output('rewriteComp');

  start = perf_hooks.performance.now();
  for (let i = 0; i < CREATE; i++) {
    entities[i].destroy();
  }
  end = perf_hooks.performance.now();
  times.destroy2Comp = end - start;
  output('destroy2Comp');


  start = perf_hooks.performance.now();
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
  end = perf_hooks.performance.now();
  times.recreating = end - start;
  output('recreating');

}

benchmarks();

console.log(times);

