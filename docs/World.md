# World

The world is the main class for **Ape ECS** . From there you can work with `Component`s, `Entity`s, `Query`s, and `System`s. Your application can have more than one world, but all of your `Entity`s, `Component`s, `System`s, and `Query`s will be specific to a given `World` (although there are ways to clone things between worlds).

An instance of `World` is essentially a registry of your game or simulation data, systems, and types. 

## World constructor

Constructs a new `World` instance.

```js
const myWorld = new ApeECS.World({ 
  trackChanges: true,
  entityPool: 10
});
```

### Arguments:
* config: `Object`, optional
  - trackChanges: `bool`, default `true`
  - entityPool: `Number`, default `10`
  

Turning off `trackChanges` removes the events that a `System` can subscribe to.

The initial `entityPool` spins up a given number `Entity` instances for later use. Pooling configuration for `Component` instances is done by indivual types at registration.

### Example:
```js
const ApeECS = require('ape-ecs');
const myworld = new ApeECS.World({
  trackChanges: true, // default
  entityPool: 10 // default
});
```

## currentTick

The `currentTick` is a Number integer property incremented by the `world.tick()` method. It can be used to determine how recently `Entity`s and `Component`s have been updated based on their `Entity.updatedComponents` and `Component._meta.updated` values.

```js
const q1 = world.createQuery().fromAll(['Position', 'Tile']);
const tiles = q1.execute({updatedComponents: world.currentTick - 1 });
```

## tick

```js
world.tick();
```

Increments the `world.currentTick` and manages any housekeeping that **Ape ECS** needs to do on the world between system runs.

## registerTags

```js
world.registerTicks(['MarkForDelete', 'Invisible', 'IsSandwich']);
```

Registers any tags that you'll be using for your Entities. 

### Arguments
* tags: `Array` of `String`s

Tags are used like `Component`s, but they're only a string. You can check if `entity.has('TagName')` just like you would a `Component` name, and use them similarly in `Query`s.

## registerComponent

Register a new `Component` type in your `World`.

👀 See the [Component Docs](Component.md) for info on how to use `Component`s.

```js
world.registerComponent('Position', {
  properties: { // required
    x: 0,
    y: 0,
    coord: '0x0',
    parent: ApeECS.Refs.EntityRef
  },
  init() { // optional
    this.coord = `${this.x}x${this.y}`;
  },
  destroy() { //optional
    console.log('Boom?');
  },
  serialize: { // optional
    skip: false,
    ignore: ['coord']
  },
  writeHooks: [ //optional
    function (compInstance, field, value) {
      switch(field) {
        case 'x':
          compInstance.coord = `${value}x${compInstance.y}`;
          break;
        case 'y':
          compInstance.coord = `${compInstance.x}x${value}`;
          break;
        case 'coord':
          value = `${compInstance.x}x${compInstance.y}`;
      }
      return value;
    }
  ]
},
100 /* optional */ );
```

### Arguments
* name: `String` -- unique name for the `Component` type.
* definition: `Object` -- definition (see below)
* poolSize: `Number`, integer, default number of this `Component` to create for a memory pool

Registers a new Component type to be used with `world.createEntity()` or `entity.addComponent()`.

☝️ If your Component doesn't need any properties or special options, register a Tag instead with `world.registerTag([])`.

💭 **Ape ECS** dynamically creates a `class` when you register a component. Have a peak at the source code in `src/world.js`.

### Component Definition

The second argument to `world.registerComponent` is a definition `Object` that requires `properties` at a minimum.

😅 Don't be intimidated by the full `definition` of a `Component`. All you need for most cases is `properties`.

#### properties
`Object` _(required)_

Each key for the properties `Object` indicates a property for your new `Component`. The value of a `properties` entry can be a `Number`, `String`, `null`, or `Ref function`, and indicates the default value for a property. 

⚠️ Using a mutable value like `{}` `[]` may cause undefined behavior when assigned as a default. If you'd like to use an `Object` type or even advanced type from a game engine, you may assign one to a property when you invoke `world.createEntity` or `entity.addComponent`, but the default during `registerComponent` should be `null`.

⚠️ Deep value changes of a mutable type like `Object` in a `Component` will not trigger a `writeHooks` function, nor will it update `component._meta.updated`.

#### init
`function` _(optional)_

This function is ran after the `Component` has been created from `world.createEntity` or `entity.addComponent`.
The `this` context is the `Component` instance.

#### destroy
`function` _(optional)_

This function is ran right before a `Component` is destroyed, either from `entity.removeComponent` or `entity.destroy`.
The `this` context is the `Component` instance.

#### serialize
`Object` _(optional)_

The serialize `Object` has two properties: `skip` and `ignore`. If `skip` is `true` (it's `false` by default), then the component is skipped entirely during `world.getObject` or `entity.getObject`. Any fields listed in the `ignore` array are skipped from `getObject`.

#### writeHooks
`[]function` _(optional)_

```js
[
  function (component, field, value) {
    return value;
  }
]
```
An array of functions that are ran when a property is set. You can manipulate the value before returning it and take other actions on the `Component` instance.

️⚠️ `writeHooks` are not run during `world.createEntity` or `entity.addComponent`. If you need to take actions on the initial property values, then use the `init` function in the `definition`.

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
