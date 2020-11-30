# Ape-ECS
![Ape-ECS Hero](https://raw.githubusercontent.com/fritzy/ape-ecs/master/imgs/ape_ecs900wbg.png)

[![npm](https://img.shields.io/npm/v/ape-ecs)](https://www.npmjs.com/package/ape-ecs)
[![Build Status](https://travis-ci.com/fritzy/ape-ecs.svg?branch=master)](https://travis-ci.com/fritzy/ape-ecs)
![Coveralls github](https://img.shields.io/coveralls/github/fritzy/ape-ecs)

A performant, featureful, and flexible [Entity-Component-System](https://en.wikipedia.org/wiki/Entity_component_system) library for JavaScript, written in ECMAScript ES2018, intended for use in games and simulations.

## Documentation
* [Overview](https://github.com/fritzy/ape-ecs/blob/master/docs/Overview.md)
* [API Reference](https://github.com/fritzy/ape-ecs/blob/master/docs/API_Reference.md)
* [Patterns](https://github.com/fritzy/ape-ecs/blob/master/docs/Patterns.md)
* [1.0 Announcement Post](https://dev.to/fritzy/introducing-ape-ecs-js-250o)
* [Changelog](https://github.com/fritzy/ape-ecs/blob/master/CHANGELOG.md)
* [Discord -- Web Platform Game Dev](https://discord.gg/hdbdueTDJk)
* [@fritzy Twitter](https://twitter.com/fritzy)

## Install

```sh
npm install ape-ecs 
```

## Differentiating Features

* Advanced Queries for entities.
* Persisted Queries (indexes) are updated as Entity composition changes.
* Component reference properties to Entities (EntityRef, EntitySet, EntityObject)
  * When a referenced entity is destroyed, the property is updated to null.
  * Subscribe-able events for adding and removing references.
  * Reverse query from entity to entity-components that reference it.
* Not all systems need to run every frame.
* Export/import support for saving/restoring state with component-level serialization configuration.
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

An in-progress arcade game [Missile Orders](https://github.com/fritzy/missileorders.git).

This game is not in a complete state yet, nor does it show off all of the potential of ECS yet.

## Running the Tests

The goal is to keep test coverage at 100%.

```sh
git clone git@github.com/fritzy/ape-ecs.git
cd ape-ecs
npm install
npm test
```
## Contributors
* [Ben Morse](https://twitter.com/benathon) -- Ben is an early adopter that provided a lot of insight and you have him to thank for the TypeScript definitions! Ben has a game, [Super Game of Life](https://github.com/esromneb/SuperGameOfLife) that uses Ape ECS.

## Special Thanks
* [Jaime Robles](https://twitter.com/DrawnByJaime) -- For the Ape ECS banner!
