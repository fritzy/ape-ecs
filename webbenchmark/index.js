const CREATE = 500000;
const ECS = require("../src/index.js");

const descriptions = {
  create2Comp: "Create 50,000 entities with two simple components ",
  destroy2Comp: "Destroy 50,000 entities with two simple components",
  recreating: "Recreating components now that pool is established",
  rewriteComp: "Changing the values of each component             ",
};

const times = {
  create2Comp: 0,
  destroy2Comp: 0,
  recreating: 0,
};

function output(test) {
  console.log(`${descriptions[test]}: ${times[test].toFixed(2)}ms`);
}

class Test extends ECS.Component {}
Test.properties = {
  a: 1,
  b: 2,
};

class Test2 extends ECS.Component {}
Test2.properties = {
  c: 3,
  d: 4,
};

function benchmarks() {
  let start, end;

  const ecs = new ECS.World({ trackChanges: false, entityPool: 100 });
  ecs.registerComponent(Test);
  ecs.registerComponent(Test2);

  const entities = [];

  console.log(`Creating and destroying ${CREATE} entities...`);

  start = performance.now();

  for (let i = 0; i < CREATE; i++) {
    entities.push(
      ecs.createEntity({
        components: [
          {
            type: "Test",
            key: "Test",
            a: 4,
            b: 5,
          },
          {
            type: "Test2",
            key: "Test2",
            c: 6,
            d: 7,
          },
        ],
      })
    );
  }

  end = performance.now();
  times.create2Comp = end - start;
  output("create2Comp");

  start = performance.now();
  for (let i = 0; i < CREATE; i++) {
    entities[i].c.Test.a = 14;
    entities[i].c.Test.b = 15;
    entities[i].c.Test2.c = 16;
    entities[i].c.Test2.d = 17;
  }
  end = performance.now();
  times.rewriteComp = end - start;
  output("rewriteComp");

  start = performance.now();
  for (let i = 0; i < CREATE; i++) {
    entities[i].destroy();
  }
  end = performance.now();
  times.destroy2Comp = end - start;
  output("destroy2Comp");

  start = performance.now();
  for (let i = 0; i < CREATE; i++) {
    entities.push(
      ecs.createEntity({
        components: [
          {
            type: "Test",
            lookup: "Test",
            a: 4,
            b: 5,
          },
          {
            type: "Test2",
            lookup: "Test2",
            c: 6,
            d: 7,
          },
        ],
      })
    );
  }
  end = performance.now();
  times.recreating = end - start;
  output("recreating");
}

function tick() {
  benchmarks();
  setTimeout(tick, 3000);
}

tick();
