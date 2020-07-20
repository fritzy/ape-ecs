# World

The world is the main class for `ecs-js`. From there you can work with components, entities, queries, and systems. Your application can have more than one world, but all of your entities, components, systems, and queries will be specific to a given world (although there are ways to clone things between worlds).

An instance of `World` is essentially a registry of Component types, Component instances, Entity Instances, and Query instances. 

## constructor

Constructs a new `World` instance.

### constructor new World(config)

### Arguments:
- config: `Object`, optional
  - trackChanges: `bool`, default `true`
  - entityPool: `Number`, default `10`

Turning off `trackChanges` removes the events that a `System` can subscribe to.

The initial `entityPool` spins up a given number `Entity` instances for later use. Pooling configuration for `Component` instances is done by indivual types at registration.

### Example:
```js
const World = require('@fritzy/ecs');
const myworld = new World({
  trackChanges: true, // default
  entityPool: 10 // default
});
```

## currentTick

### property world.currentTick

## tick

## registerTags

## registerComponent

## createEntity

## createEnitityComponents

## getObject

## createEntities

## copyTypes

## removeEntity

## getEntity

## getEntities

## createQuery

## subscribe

## addSystem

## runSystemGroup

## updateIndexes
