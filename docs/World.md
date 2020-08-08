# World

The world is the main class for **Ape ECS** . From there you can work with `Components`, `Entities`, `Queries`, and `Systems`. Your application can have more than one world, but all of your `Entities`, `Components`, `Systems`, and `Queries` will be specific to a given `World` (although there are ways to clone things between worlds).

An instance of `World` is essentially a registry of your game or simulation data, systems, and types. You've got to start with a world before you can do anything else. Typically you create your world, register your tags, components, and systems, and then start creating entities and running systems.

## Index
* [World constructor](#world-constructor)
* [currentTick](#currenttick)
* [tick](#tick)
* [registerComponent](#registercomponent)
* [registerTags](#registertags)
* [createEntity](#createentity)
* [getObject](#getobject)
* [createEntities](#createentities)
* [copyTypes](#copytypes)
* [getEntity](#getEntity)
* [removeEntity](#removeEntity)
* [getEntities](#getEntities)
* [createQuery](#createquery)
* [registerSystem](#registerSystem)
* [runSystems](#runSystems)
* [subscribe](#subscribe)

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
  - entityPool: `Number`, default `1`
  
### Notes:

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

The `currentTick` is a Number integer property incremented by the `world.tick()` method. It can be used to determine how recently `Entities` and `Components` have been updated based on their `Entity.updatedComponents` and `Component._meta.updated` values.

```js
const q1 = world.createQuery().fromAll(['Position', 'Tile']);
const tiles = q1.execute({updatedComponents: world.currentTick - 1 });
```

## tick

```js
world.tick();
```

Increments the `world.currentTick` and manages any housekeeping that **Ape ECS** needs to do on the world between system runs. Once you've run through all of your `Systems` you should `world.tick()` before you do again.

## registerComponent

Register a new `Component` type in your `World`.

👀 See the [Component Docs](Component.md) for info on how to use `Components`.

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


### Notes:

Registers a new Component type to be used with `world.createEntity()` or `entity.addComponent()`.

☝️ If your Component doesn't need any properties or special options, register a Tag instead with `world.registerTag([])`.

💭 **Ape ECS** dynamically creates a `class` when you register a component. Have a peak at the source code in `src/world.js`.

### Component Definition

The second argument to `world.registerComponent` is a definition `Object` that requires `properties` at a minimum.

😅 Don't be intimidated by the full `definition` of a `Component`. All you need for most cases is `properties`.

#### properties
`Object` _(required)_

Each key for the properties `Object` indicates a property for your new `Component`. The value of a `properties` entry can be a `Number`, `String`, `null`, or `Ref function`, and indicates the default value for a property. 

👀 See the [Refs Docs](Refs.md) to learn about the Entity Ref property functions.

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

## registerTags

```js
world.registerTicks(['MarkForDelete', 'Invisible', 'IsSandwich']);
```

Registers any tags that you'll be using for your Entities. 

### Arguments
* tags: `[]String`

Tags are used like `Components`, but they're only a string. You can check if `entity.has('TagName')` just like you would a `Component` name, and use them similarly in `Queryies`. They're using for knowing if an `Entity` "is" something, but you don't need any further properties to describe that aspect.

## createEntity

Create a new Entity, including any initial components (and their initial property values) or tags. It returns a new `Entity` instance.

```js
const playerEntity = world.createEntity({
  id: 'Player', // optional
  tags: ['Character', 'Visible'], //optional
  components: [ // optional
    {
      type: 'Slot',
      name: 'Left Hand',
      slotType: 'holdable'
    },
    {
      type: 'Slot',
      name: 'Right Hand',
      slotType: 'holdable'
    },
    {
      type: 'Slot',
      name: 'Body'
      slotType: 'body'
    },
  ],
  c: { // optional
    Controls: {
      boundTo: 'keyboard',
      keysDown: []
    },
    Position: {
      x: 15,
      y: 23
    },
    Inventory: {
      type: 'Container' // specified type different than the lookup
      size: 16
    },
    footSlot: {
      type: 'Slot'
      name: 'Feet'
      slotType: 'shoes'
    }
  }
});
```

### Arguments:
* definition `Object`, _required_
  * id: `String`, _optional_, unique identifier (generated if not specified)
  * tags: `[]String`, _optional_, any registered tags to include
  * components: `[]Object`, _optional_, initial components
    * type: `String`, _required_, registered component type
    * id: `String`, _optional_, unique identifier (generated if not specified)
    * lookup: `String`, _optional_, lookup value of the component instance in the `Entity`. If not specified, tye component instance has no lookup value, and is only included in the `Set` of `entity.components['ComponentType']` values.
    * \*properties: initial values for defined properties of the component
  * c: `Object`: _optional, Components indexed by a lookup value. Equivalant to specifying the `lookup` and `type` in the `components` array property.
    * `key` is the `lookup` value of the component instance. Also the component type if one is not specified.
    * `value` is an `Object` defining the initial values of a `Component`
      * `type`: `String`, _optional_, If not specified, the `lookup` key needs to be a registered `Component` type. 
      * `id`:  `String`, _optional_, unique identifier (generated if not specified)
      * \*properties: initial values for defined properties of the component

### Notes: 
👀 For more information on how lookups work, see the [Entity Docs](Entity.md).

☝️ The createEntity definition schema is the same one used by `entity.getObject` and `world.getObject`. As such, you can save and restore objects by saving the results of these methods and calling `world.createEntity` with the same `Object` to restore it.

💭 **Ape ECS** uses a very fast unique id generator for `Components` and `Entities` if you don't specify a given id upon creation. Look at the code in [src/util.js](src/util.js).

## getObject

Retrieves a serializable object that includes all of the Entities and their Components in the World.
Returns an array of Entity definitions. See [world.createEntity](#createEntity);

```js
const saveState = world.getObject();
const jsonState = JSON.stringify(saveState);
```

## createEntities

Just like [world.createEntity](#createEntity) except that it takes an array of `createEntity` definitions.

```js
world.createEntities([
  {
    tags: ['Tile', 'Visible', 'New'],
    components: [
      {
        type: 'Sprite':
        texture: 'sprites/tiles/ground1.png'
      }
    ],
    c: {
      Position: {
        x: 0,
        y: 0
      }
    }
  },
  {
    tags: ['Tile', 'Visible', 'New'],
    components: [
      {
        type: 'Sprite':
        texture: 'sprites/tiles/ground1.png'
      }
    ],
    c: {
      Position: {
        x: 1,
        y: 0
      }
    }
  },
  {
    tags: ['Character', 'Player'],
    id: 'Player'
    c: {
      Position: {
        x: 0,
        y: 0
      }
    }
  }
]);
```

## copyTypes

Copy registered Component types from another world to this one.

```js
world.copyTypes(world2, types);
```

### Arguments:
* world2: `World instance`, _required_
* types: `[]String`, _required_, Registered `Component` types that you'd like to copy from world2

## getEntity

Get an `Entity` instance by it's `id` or `undefined`.

```js
const entity1 = world.getEntity('aabbccdd-1');
```

### Arguments
* id: `String`, _required_, The id of an existing `Entity` instance.

## removeEntity

Removes an `Entity` instance from the `world`, initializing its `destroy()`.

### Arguments:
* id/entity: `String` or `Entity instance` of an existing `Entity`.

### Notes:

☝️ Equivalent to:

```js
world.getEntity(id).destroy();
```

## getEntities

Retrieve a `Set` of all the `Entities` that include a given `Component` type or Tag.

```js
const tiles = world.getEntities('Tile');
```

### Notes:

☝️ You could also do this with a `Query`.

```js
const q1 = world.createQuery().fromAll(['Tile']);
const tiles = q1.execute();
```

## createQuery

Factory that returns a new `Query` instance.

```js
const query1 = world.createQuery({ /* config */}).fromAll(['Tile', 'Position']);
const tiles = query1.execute({ /* filter */ });
```

### Notes:

👀 See the [Query Docs](Query.md) to learn more about creating them and using them. 
Queries are a big part of **Ape ECS** and are fairly advanced.

☝️ You can also `createQuery` from a `System`. `Systems` can persist `Queries` which then act as an index to results that automatically stays up to date as `Entity` composition changes.

## registerSystem

Registers a `System` class or instance with the world for later execution.

```js
class Gravity extends ApeECS.System {}

world.registerSystem('movement', Gravity);
```

### Arguments:
* group: `String` name for the group of Systems
* system: `System class` or `System instance`

### Returns:
* `System` instance.

You can have one, many, or all of your `Systems` in a single "group."
You might have a "startup" group of `Systems` that initializes a level, a "turn" group that runs for every user turn, and a "frame" group that runs for every rendered frame of animation.
If you always run all of your `Systems` every time, you could just register them all with the same group.
If you want to be able to run any `System` at an time in any order, you could register every `System` with a unique group. 
 

### Notes:

👀 See the [System Docs](System.md) for more information about registering `Systems`.

## runSystems

Runs the added `Systems` that were registered with that specific group, in order.

```js
world.runSystems(group);
```

### Notes:

👀 See the [System Docs](System.md) for more information about running `Systems`.

## subscribe

Subscribe a `System instance` to events from a given `Component` type.

```js
world.subscribe(system, type);
```

### Arguments:
* system: `System instance`, _required_
* type:  `String`, _required_, registered `Component` type