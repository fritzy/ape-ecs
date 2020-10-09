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
* [getEntity](#getentity)
* [removeEntity](#removeentity)
* [getEntities](#getentities)
* [getComponent](#getcomponent)
* [createQuery](#createquery)
* [registerSystem](#registersystem)
* [runSystems](#runsystems)
* [updateIndexes](#updateindexes)

## World constructor

Constructs a new `World` instance.

```js
const myWorld = new ApeECS.World({ 
  trackChanges: true,
  entityPool: 10,
  cleanupPools: true,
  useApeDestroy: true
});
```

### Arguments:
* config: `Object`, optional
  - trackChanges: `bool`, default `true`
  - entityPool: `Number`, default `10`
  - cleanupPools: `bool`, default `true`
  - useApeDestroy: `bool`, default `false`:
  
### Notes:

Turning off `trackChanges` removes the events that a `System` can subscribe to.

The initial `entityPool` spins up a given number `Entity` instances for later use. Pooling configuration for `Component` instances is done by indivual types at registration.

`cleanupPools` shrinks the pool back down to between the set pool size and double the the pool size. Without it, the pool can be as large as the max number of entities or a given component type that has ever existed.

`useApeDestroy` adds the `ApeDestroy` tag and `ApeCleanup` system group, which then runs at each [tick()](#tick).
If you want to destroy an Entity, but not until the end of the tick, just add the tag `ApeDestroy`.
It keeps the entity around until the end, but it won't show up in [Query.execute()](./Query.md#execute) results unless you set `createQuery({ includeApeDestroy: true })`.
`useApeDestroy` setup up a set of builtin behaviors for a common pattern.

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
const q1 = world.createQuery().fromAll('Position', 'Tile');
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
class Position extends ApeECS.Component {
  static properties = {
    x: 0,
    y: 0,
    coord: '0x0',
    parent: ApeECS.EntityRef
  }

  static serialize = true; // optional, default
  static serializeFields = ['x', 'y']; // optional
  // default is null, when serializeFields not specified, all properties are serialized

  init() { // optional
    this.coord = `${this.x}x${this.y}`;
  }

  preDestroy() { //optional
    console.log('Boom?');
  }

  get coord() {
    return `${this.x}x${this.y}`;
  }

}

world.registerComponent(Position, 100);
```

### Arguments
* definition: `<ApeECS.Component>`
* poolSize: `Number`, integer, default number of this `Component` to create for a memory pool


Registers a new Component type to be used with `world.createEntity()` or `entity.addComponent()`.

☝️ If your Component doesn't need any properties or special options, register a Tag instead with `world.registerTag()`.

👀 See the [Component docs](./Component.md) in learn how to properly extend `ApeECS.Component`.

## registerTags

```js
world.registerTicks('MarkForDelete', 'Invisible', 'IsSandwich');
```

Registers any tags that you'll be using for your Entities. 

### Arguments
* ...tags: `String`

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
      type: 'Container' // specified type different than the key
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
    * key: `String`, _optional_, key value of the component instance in the `Entity`. If not specified, tye component instance has no key value, and is only included in the `Set` of `entity.components['ComponentType']` values.
    * \*properties: initial values for defined properties of the component
  * c: `Object`: _optional, Components indexed by a key value. Equivalant to specifying the `key` and `type` in the `components` array property.
    * `key` is the `key` value of the component instance. Also the component type if one is not specified.
    * `value` is an `Object` defining the initial values of a `Component`
      * `type`: `String`, _optional_, If not specified, the `key` key needs to be a registered `Component` type. 
      * `id`:  `String`, _optional_, unique identifier (generated if not specified)
      * \*properties: initial values for defined properties of the component

### Notes: 
👀 For more information on how keys work, see the [Entity Docs](Entity.md).

☝️ The createEntity definition schema is the same one used by `entity.getObject` and `world.getObject`. As such, you can save and restore objects by saving the results of these methods and calling `world.createEntity` with the same `Object` to restore it.

💭 **Ape ECS** uses a very fast unique id generator for `Components` and `Entities` if you don't specify a given id upon creation. Look at the code in [src/util.js](../src/util.js).

## getObject

Retrieves a serializable object that includes all of the Entities and their Components in the World.
Returns an array of Entity definitions. See [world.createEntity](#createentity);

```js
const saveState = world.getObject();
const jsonState = JSON.stringify(saveState);
```

## createEntities

Just like [world.createEntity](#createentity) except that it takes an array of `createEntity` definitions.

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
const q1 = world.createQuery().fromAll('Tile');
const tiles = q1.execute();
```

## getComponent

Get an `Component` instance by its `id`.

```js
const component = world.getComponent('alakjds-123');
```

**Arguments**:
* id: `String`, _required_, unique id of a component

## createQuery

Factory that returns a new `Query` instance.

```js
const query1 = world.createQuery({ /* config */}).fromAll('Tile', 'Position');
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

## getStats

Get the World stats (currently pooling status)

```js
const stats = world.getStats();
console.log(stats);
```

```js
{
  entity: { active: 23, pooled: 77, target: 100 },
  SomeComponent: { active: 30 pooled: 20, target: 50 },
  SomeOtherComponent: { active: 30 pooled: 0, target: 10 }
}
```

👆 When you [registerComponent](#registercomponent), the second argument is your target pool size.

👆 You can go over your target pool size, and if the world configuration of `cleanupPools` is true (the default), any unused pooled items over double the target will be slowly decreased until somewhere between double and the target.

## logStats

```js
world.logStats(60, console.log);
```

```
3, Entity 23 active 77/100 pooled
3, SomeComponent 30 active 20/50 pooled
3, SomeOtherComponent 30 active 0/10 pooled
```

**Arguments**:
* freq: Number, _required_: How frequently in ticks to call the log
* callback: function, _optional_: function to call with stats logs, default: console.log

## updateIndexes

Method that updates persisted queries after system runs and upon ticks.

```js
world.updateIndexes();
```

You can update the results of persisted queries for changed entities within a system update by calling this method.
It won't do anything for non-system, non-persisted queries.
