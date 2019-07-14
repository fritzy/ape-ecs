# @fritzy/ecs

An [Entity-Component-System](https://en.wikipedia.org/wiki/Entity_component_system) library for JavaScript, written in ECMAScript 2018, intended for use in games and simulations.

Features:

* Easy to define Components.
* Component properties can be primitive types, Arrays, Objects, or References.
* Component reference types to Entities and Components (including Objects and Arrays of references)
* Components can be singular per entity or allow multiple.
* Multi-Components can be sets or mapped by a property.
* Query for entities by which components it must and must not have.
* Filter component queries by recent changes to component values or included components.
* Systems can subscribe to component change logs by component type.
* Systems have default entity queries that are persisted.
* Persisted queries are updated as entities change.
* Export/import support for saving state.
* 100% Test Coverage.

Using This Library
  * [Example Game](#exampleGame)
  * Install
  * Tests

[ECS](#ecsClass)
  * Using ECS
  * [constructor](#ecsConstructor)
  * [registerComponent method](#ecsRegisterComponent)
  * [registerComponentClass method](#ecsRegisterComponentClass)
  * [createEntity method](#ecsCreateEntity)
  * [removeEntity method](#ecsRemoveEntity)
  * [getEntity method](#ecsGetEntity)
  * [queryEntities method](#ecsQueryEntity)
  * [getComponents method](#ecsGetComponents)
  * [addSystem method](#ecsAddSystem)
  * [runSystemGroup method](#ecsRunSystemGroup)
  * [tick method](#ecsTick)

Component
  * Using Components
  * definition
    * primitive properties
    * Entity and Component References
    * serialize
  * constructor
  * getObject method

Entity
  * Using Entities
  * constructor
  * addComponent method
  * removeComponent method
  * removeComponentByName method
  * getObject method
  * destroy method

System
  * Using Systems
  * constructor
  * update method

<a name="exampleGame"></a>
## Example Game

[Roguelike Example Using @fritzy/ecs + rot.js](https://github.com/fritzy/ecs-js-example)

## Install

```sh
npm install @fritzy/ecs 
```

## Tests

The goal is to keep test coverage at 100%.

```sh
git clone git@github.com/fritzy/ecs-js.git
cd ecs-js
npm install
npm test
```

<a name="ecsClass"></a>
## ECS

The main class of this library manages all of the entities and components.


<a name="ecsConstructor"></a>
### constructor

__Arguments__: None

```js
const ECS = require('@fritzy/ecs');
const ecs = new ECS.ECS();
ecs.registerComponent('Tile', { });
// ...
```

<a name="ecsRegisterComponent"></a>
### registerComponent

Register a component type by defining the name, properties, and options for a component.

__Arguments__:
 * [string] name
 * [object] definition

Defintions have the following structure:

```js
{
  properties: {
    property_name: 'default value',
    property_name2: 'default value',
    another_property: '<Entity>' // special types are set with <type>.
  },
  multiset: false // [boolean],
  mapBy: 'name' // if multiset and set to true, 
}
```

You have have any number of properties. Advanced types are currently: 
 * &lt;Entity&gt;
 * &lt;EntitySet&gt;
 * &lt;EntityObject&gt;
 * &lt;Component&gt;
 * &lt;ComponentSet&gt;
 * &lt;ComponentObject&gt;

If multiset is false (default), then each entity can only have one instance of a component. You'll be able to access the instance in an entity by name like:

```js
entity['ComponentName']
```

If multiset is true, then many instances of a the component can be in an component. You'll be able to access them:

```js
for (const component of entity['ComponentName']) {
  // ...
}
```

If multieset is true, and `mapBy` is one of the property names, you can access the multiple instances by the mapBy property value.

```js
entity['ComponentName']['value_of_the_mapBy_property']
```

Here is an example of each configuration of component.


```js

//basic 

ecs.registerComponent('ControlledByPlayer', {
  properties: {
    numberOfTurns: 0
  }
});

// multiset = false
ecs.registerComponent('Weapon', {
  properties: {
    name: 'sword',
    dmg: 30,
    hitChance: .8,
  }
});

// multiset = true
ecs.registerComponent('StatBonus', {
  properties: {
    from: '',
    hp: 0,
    dex: 0,
    int: 0
  },
  multiset: true
});

// multislot with  mapBy
ecs.registerComponent('EquipmentSlot', {
  properties: {
    name: 'hand',
    slot: '<Entity>'
  },
  multiset: true,
  mapBy: 'name'
});

const sword = ecs.createEntity({
  Weapon: {
    name: 'sword of whatever',
    dmg: 7,
    hitChance: .67
  }
});

const player = ecs.createEntity({
  ControlledByPlayer: {}
  StatBonus: [
    {
      from: 'ring of intelligence',
      int: 3
    },
    {
      from: 'shoulders of moving fast',
      dex: 2
    },
    {
      from: 'boots of constitution',
      hp: 5
    },
  ],
  EquipmentSlot: {
    leftHand: {},
    rightHand: {}
  }
});

player.EquipmentSlot.rightHand.slot = sword;
console log(player.EquipmentSlot.rightHand.slot.name); // sword of whatever

const bonuses = [...player.StatBonus];
console.log(bonsuses[1].dex);  // 2

console.log(player.ControlledByPlayer.numberOfTurns); // 0
```

<a name="ecsRegisterComponentClass"></a>
### registerComponentClass

Instead of passing the definition to `registerComponent` you can extend the `BaseComponent` class directly, and attach your definition object (as described in [registerComponent](#ecsRegisterComponent)) as property directly on the class.

⚠️ There isn't currently a use case (that I can think of) to use this method over using `registerComponent`.

__Arguments__:
 * [class] klass // class reference (not an instance) that extends BaseComponent and has an attached `definition`.

```js
const ECS = require('ecs');
const ecs = new ECS.ECS();

class MyComponent extends ECS.BaseComponent {
}
MyComponent.definition = {
  properties: {
    name: 'hand',
    slot: '<Entity>'
  },
  multiset: true,
  mapBy: 'name'
};

ecs.registerComponentClass(MyComponent);
```

<a name="ecsCreateEntity"></a>
### createEntity

Create an entity and populate it's initial componenents with values.

__Arguments__:
  * [object] definition

The root keys to the definition object must be one of the component type names or `id`. For every component type, you must have previously registered it with [registerComponent](#ecsRegisterComponent) or [registerComponentClass](#ecsRegisterComponentClass). For each component intiialized in the entity definition, you may only use keys that were defined as properties when the component was registered.

If the component was not set with `multiset` as `true`, then the component value is simply an object of component properties with values. If multiset was set to true, and no `mapBy` was defined, then you can defined an array with each entry being an object with properties and values. If `mapBy` was set, you can have an object of string or number values of the property that `mapBy` refers to that each references an object of properties and values, excluding the mapBy property which will be automatically assigned. You can also just use a simple array of objects as if you didn't set `mapBy`, but you will later need to access those components by the mapBy property value as if you had defined them that way.


<a name="ecsRemoveEntity"></a>
### removeEntity

Removes an entity from the ECS instance by it's id.

__Arguments__:
 * [string] entity id

<a name="ecsGetEntity"></a>
### getEntity

Returns an entity by id.

__Arguments__:
  * [string] entity id

__Returns__: Entity instance

<a name="ecsQueryEntities"></a>
### queryEntities

Query for entites, filtered by various parameters. Queries may be persisted, an optimization which keeps and updates results for the next use.

__Arguments__:
  * [object]:
    * has: [array of strings] component types that an entity must have
    * hasnt: [array of strings] component types that an entity must not have
    * persist: [boolean] persist and maintain results
    * updatedValues [number] filter out entities that haven't had component value updates since this tick
    * updatedComponents [number] filter out entities that haven't had components added/removed since this tick

Default argument object:
```js
{
  has: [],
  hasnt: [],
  persist: false,
  updatedValues: 0,
  updatedComponents: 0
}
```

__Returns__: Set of Entity instances

<a name="ecsGetComponents"></a>
### getComponents

Get a set of all components of a given type.

__Arguments__:
  * [string] component type

<a name="ecsAddSystem"></a>
### addSystem

Add a system to the ECS instance, wihin a group.

__Arguments__:
  * [string] group name
  * [System instance]

<a name="ecsRunSystemGroup"></a>
### runSystemGroup

Runs the systems of a given group, in the order added.

__Arguments__:
  * [string] group name

<a name="ecsTick"></a>
### tick

Iterate the tick. Useful for for systems to track logical frames and to filter query results. Currently this is equivalent to `ecs.ticks++` but other logic and optimizations may be added in the future, related to frame tracking.


__Returns__: [number] new frame tick number

