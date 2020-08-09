# Ape-ECS
![Ape-ECS Hero](https://raw.githubusercontent.com/fritzy/ape-ecs/lightweight/imgs/ape_ecs900wbg.png)

A performant [Entity-Component-System](https://en.wikipedia.org/wiki/Entity_component_system) library for JavaScript, written in ECMAScript ES2018, intended for use in games and simulations.

## Documentation
* [Overview](https://github.com/fritzy/ape-ecs/blob/lightweight/docs/Overview.md)
* [API Reference](https://github.com/fritzy/ape-ecs/blob/lightweight/docs/API_Reference.md)

## Install

```sh
npm install ape-ecs 
```

## Some Ape ECS Features

* Easy to define Components.
* Advanced Queries based on Entity-Component composition, Entity references, and the last updated.
* Persisted queries are updated as Entity composition changes.
* Component reference types to Entities (EntityRef, EntitySet, EntityObject)
* Export/import support for saving/restoring state.
* 100% Test Coverage.

## Example

```js
const ApeECS = require('ape-ecs');

class Gravity extends ApeECS.System {
  init() {
    this.mainQuery = this.createQuery().fromAll('Position', 'Physics');
  }

  update(tick) {
    const entities = this.mainQuery.execute();
    const frameInfo = this.world.getEntity('frame');
    for (const entity of entities) {
      const point = entity.getOne('Position');
      if (!entity.has('Vector')) {
        entity.addComponent({
          type: 'Vector',
          mx: 0,
          my: 0
        })
      }
      const vector = entity.getOne('Vector');
      vector.my += 9.807 * frame.time.deltaTime * .01;
      vector.update();
    }
  }
}

class Position extends ApeECS.Component {
  static properties = {
    x: 0,
    y: 0
  }
}

class Vector extends ApeECS.Component {
  static properties = {
    mx: 0,
    my: 0,
    speed: 0
  }

  get speed() {
    return Math.sqrt(this.mx**2 + this.my**2);
  }
}

class FrameInfo extends ApeECS.Component {
  static properties = {
    deltaTime: 0,
    deltaFrame: 0,
    time: 0
  }
}

const world = new ApeECS.World();
world.registerComponent(Position);
world.registerComponent(Vectory);
world.registerComponent(FrameInfo);
world.registerTags('Physics');
world.registerSystem('frame', Gravity);

const frame = world.createEntity({
  id: 'frame',
  c: {
    time: {
      type: 'FrameInfo',
    }
  }
})

// see world.creatEntity and world.createEntities
// in docs/World.md for more details
world.registerSystem('frame', require('./move.js'));
world.createEntities(require('./saveGame.json'));

let lastTime = 0;

function update(time) {
  const delta = time - lastTime;
  time = lastTime;
  frame.time.update({
    time: time,
    deltaTime: delta,
    deltaFrame: delta / 16.667
  });
  world.runSystems('frame');
  // run update again the next browser render call
  // every 16ms or so
  window.requestAnimationFrame(update);
}
update(0);
```

## More About ECS

The Entity-Component-System paradigm is great for managing dynamic objects in games and simulations. Instead of binding functionality to data through methods, entities are dynamically composed of any combination of types. Separate systems are then able to query for entities with a given set of types. 

ECS's dynamic data composition and freely interacting systems leads to:
  * More complex and dynamic composition than OOP
  * Improved performance due to lack of API methods
  * [Emergent Gameplay](https://en.wikipedia.org/wiki/Emergent_gameplay) with logical behavior extended beyond the programmer's vision.

This library has been inspired in part by:
  * [Overwatch Gameplay Architecture and Netcode](https://www.youtube.com/watch?v=W3aieHjyNvw)
  * [Mozilla ECSY](https://blog.mozvr.com/introducing-ecsy/)

## Example Game

[Roguelike Example Using @fritzy/ecs + rot.js](https://github.com/fritzy/ecs-js-example)

## Running the Tests

The goal is to keep test coverage at 100%.

```sh
git clone git@github.com/fritzy/ape-ecs.git
cd ape-ecs
npm install
npm test
```
