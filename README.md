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
  * Example Game
  * Install
  * Tests
[ECS](#ecsClass)
  * Using ECS
  * [constructor](#ecsConstructor)
  * [registerComponent method](#ecsRegisterComponent)
  * [registerComponentClass method](#ecsRegisterComponentClass)
  * createEntity method
  * removeEntity method
  * getEntity method
  * queryEntities method
  * getComponents method
  * subscribe method
  * addSystem method
  * runSystemGroup method
  * tick method

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

Arguments: None

```js
const ECS = require('@fritzy/ecs');
const ecs = new ECS.ECS();
ecs.registerComponent('Tile', { });
// ...
```

<a name="ecsRegisterComponent"></a>
### registerComponent

Register a component type by defining the name, properties, and options for a component.

Arguments:
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
