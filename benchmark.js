const CREATE = 500000;
const ECS = require('./src/index');
const perf_hooks = require('perf_hooks');


const ecs = new ECS.ECS();
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

const start = perf_hooks.performance.now();

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

/*
for (let i = 0; i < CREATE; i++) {
  entities[i].destroy();
}
*/
const end = perf_hooks.performance.now();

console.log(`Time: ${(end - start).toFixed(2)}ms`);
