# @fritzy/ecs

An [Entity-Component-System](https://en.wikipedia.org/wiki/Entity_component_system) library for JavaScript, written in ECMAScript 2018, intended for use in games and simulations.

__Features__:

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

__About__:

The Entity-Component-System paradigm is great for managing dynamic objects in games and simulations. Instead of binding functionality to data through methods, systems are able to freely manipulate data directly, so long as they have the datatypes it expects and filters for. This encourages dynamic composition of Entities and systems that can freely interact through shared data. 

This arrangement of dynamic data types within an object and freely interacting systems leads to:
  * more complex types
  * improved performance due to lack of API methods
  * [emergent gameplay](https://en.wikipedia.org/wiki/Emergent_gameplay) with logical behaviors that the programmer didn't necessarily directly envision


This library is not a strict/pure Entity-Component-System library for a few reasons:
  * Entities aren't just ids that component can have in common -- they're classes that have properties for all of their components.
  * Components are a little more advanced than just data, but we try to make it feel that way. Components are models with advanced features.
  * All of the entities, components, and systems are managed by an ECS class as a sort of registery.

I built this library around the ideas and scenarios best illustrated by this [Overwatch Gameplay Architecture and Netcode](https://www.youtube.com/watch?v=W3aieHjyNvw) video (only the first half is very relevant).

__Using This Library__
  * [Example Game](#exampleGame)
  * [Install](#install)
  * [Tests](#tests)

## Reference Index

[ECS](#ecs)
  * [constructor](#ecsConstructor)
  * [registerComponent method](#ecsRegisterComponent)
  * [registerComponentClass method](#ecsRegisterComponentClass)
  * [registerTags method](#ecsRegisterTags)
  * [createEntity method](#ecsCreateEntity)
  * [removeEntity method](#ecsRemoveEntity)
  * [getEntity method](#ecsGetEntity)
  * [queryEntities method](#ecsQueryEntities)
  * [getComponents method](#ecsGetComponents)
  * [addSystem method](#ecsAddSystem)
  * [runSystemGroup method](#ecsRunSystemGroup)
  * [tick method](#ecsTick)

[Component](#component)
  * [definition](#componentDefinition)
  * [Properties](#componentProperties)
  * [constructor](#componentConstructor)
  * [getObject method](#componentGetObject)
  * [stringify method](#componentStringify)

[Entity](#entity)
  * [Properties](#entityProperties)
  * [Component Properties](#entityComponentProperties)
  * [constructor](#entityConstructor)
  * [addComponent method](#entityAddComponent)
  * [removeComponent method](#entityRemoveComponent)
  * [removeComponentByType method](#entityRemoveComponentByType)
  * [addTag method](#entityAddTag)
  * [removeTag method](#entityRemoveTag)
  * [has method](#entityHas)
  * [getObject method](#entityGetObject)
  * [destroy method](#entityDestroy)

[System](#system)
  * [constructor](#systemConstructor)
  * [Properties](#systemProperties)
  * [Changes](#systemChanges)
  * [update method](#systemUpdate)

<a name="exampleGame"></a>
## Example Game

[Roguelike Example Using @fritzy/ecs + rot.js](https://github.com/fritzy/ecs-js-example)

<a name="install"></a>
## Install

```sh
npm install @fritzy/ecs 
```

<a name="tests"></a>
## Tests

The goal is to keep test coverage at 100%.

```sh
git clone git@github.com/fritzy/ecs-js.git
cd ecs-js
npm install
npm test
```

<a name="ecs"></a>
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
### registerComponent method

Register a component type by defining the name, properties, and options for a component.

👀 See [Component](#component) for more information.

__Arguments__:
 * [string] name
 * [object] definition

Defintions have the following structure:

```js
{
  properties: {
    property_name: 'default value',
    property_name2: 'default value',
    some_advanced_property: '<Entity>' // special types are set with <type>.
  },
  many: false // [boolean],
  mapBy: 'name' // if many and set to true, 
  serilize: {
    skip: false,
    serialize.ignore: []
  },
  init() {
  },
  destroy() {
  }
}
```

You have have any number of properties. Advanced types are currently: 
 * &lt;Entity&gt;
 * &lt;EntitySet&gt;
 * &lt;EntityObject&gt;
 * &lt;Component&gt;
 * &lt;ComponentSet&gt;
 * &lt;ComponentObject&gt;
 * &lt;Pointer path.to.other.value&gt;

If `many` is false (default), then each entity can only have one instance of a component. You'll be able to access the instance in an entity by name like:

```js
entity['ComponentName']
```

If `many` is true, then many instances of a the component can be in an component. You'll be able to access them:

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

// many = false
ecs.registerComponent('Weapon', {
  properties: {
    name: 'sword',
    dmg: 30,
    hitChance: .8,
  }
});

// many = true
ecs.registerComponent('StatBonus', {
  properties: {
    from: '',
    hp: 0,
    dex: 0,
    int: 0
  },
  many: true
});

// multislot with  mapBy
ecs.registerComponent('EquipmentSlot', {
  properties: {
    name: 'hand',
    slot: '<Entity>'
  },
  many: true,
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

The `serial` section of deals with calling `getObject` and `stringify` either on the Component instance itself or the Entity. Advanced reference types are serialized with their id. Some types just can't be reasonably serialized, and so this `serialize` definition includes ways to avoid serializing an entire component type or specific properties.

```js
{
  skip: false, // set to true to ingore the whole component when serializing
  ignore: [] // array of string property names to avoid serializing
}
```

If you had a Sprite component, you might have `path` and `texture` properties. You may want to add `'texture'` to the `skip.ignore` array, so that it isn't serialized, but could be populated after using the serialized object with `createEntity` by loading the texture from the `path` property.

Serialized entities and components are useful for save files, and can be used to restore state with `createEntity`.

`init` and `destroy` functions are called with the component as the `this` context.

<a name="ecsRegisterComponentClass"></a>
### registerComponentClass method

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
  many: true,
  mapBy: 'name'
};

ecs.registerComponentClass(MyComponent);
```

<a name="ecsRegisterTags"></a>
### registerTags method

__Arguments__:
  * [array of strings]: Allowed tags

<a name="ecsCreateEntity"></a>
### createEntity method

Create an entity and populate it's initial componenents with values.

__Arguments__:
  * [object] initial values

The root keys to the definition object must be one of the component type names or `id`. For every component type, you must have previously registered it with [registerComponent](#ecsRegisterComponent) or [registerComponentClass](#ecsRegisterComponentClass). For each component intiialized in the entity definition, you may only use keys that were defined as properties when the component was registered.

If the component was not set with `many` as `true`, then the component value is simply an object of component properties with values. If `many` was set to true, and no `mapBy` was defined, then you can defined an array with each entry being an object with properties and values. If `mapBy` was set, you can have an object of string or number values of the property that `mapBy` refers to that each references an object of properties and values, excluding the mapBy property which will be automatically assigned.

If you specify `tags` as an array in the object, then your entity will initialize with those tags. They must have been registered as possible tags.

👀 See [Component Definition](#componentDefinition) for more details.
👀 See [ecs.registerComponent](#ecsRegisterComponent) for examples.

<a name="ecsRemoveEntity"></a>
### removeEntity method

Removes an entity from the ECS instance by it's id.

__Arguments__:
 * [string] entity id

<a name="ecsGetEntity"></a>
### getEntity method

Returns an entity by id.

__Arguments__:
  * [string] entity id

__Returns__: Entity instance

<a name="ecsQueryEntities"></a>
### queryEntities method

Query for entites, filtered by various parameters. Queries may be persisted, an optimization which keeps and updates results for the next use.

If you use this from a system update, set persist to a unique string and it will keep the results updated for the next time it is run with the same persist string.

__Arguments__:
  * [object]:
    * has: [array of strings] component types or tags that an entity must have
    * hasnt: [array of strings] component types or tags that an entity must not have
    * persist: [false or string] persist and maintain results
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
### getComponents method

Get a set of all components of a given type.

__Arguments__:
  * [string] component type

<a name="ecsAddSystem"></a>
### addSystem method

Add a system to the ECS instance, wihin a group.

__Arguments__:
  * [string] group name
  * [System instance]

<a name="ecsRunSystemGroup"></a>
### runSystemGroup method

Runs the systems of a given group, in the order added.

__Arguments__:
  * [string] group name

<a name="ecsTick"></a>
### tick method

Iterate the tick. Useful for for systems to track logical frames and to filter query results. Currently this is equivalent to `ecs.ticks++` but other logic and optimizations may be added in the future, related to frame tracking.


__Returns__: [number] new frame tick number


<a name="component"></a>
## Component

Components are the building blocks and models of the Entity-Component-System paradigm. 

⚠️  Due to the lack of properties in class definitons for ES2018, this library takes a metaprogramming approach, and allows you define Component models with [ecs.registerComponent](#ecsRegisterComponent), which in turn creates a class that defines those properties within its `constructor`. Components are locked down with [Object.seal()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/seal), keeping their properties strict.

<a name="componentDefinition"></a>
### definition

👀 See [ecs.registerComponent](#ecsRegisterComponent) for more details.  
👀 See [ecs.registerComponentClass](#ecsRegisterComponentClass) for more details.

<a name="componentProperties"></a>
### Accessing Properties

You can access defined properties directly on the class instance, which you likely are accessing through an Entity instance.

👀 See [Entity Properties](#entityProperties) to see how to access Component instances off of an Entity instance.

You cannot set or get properties that weren't defined in the Component definition because Component instances are sealed with [Object.seal()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/seal) in the constructor.


Properties can be accessed directly off of the component instance, but involve getters and setters to hidden (non-iterable properties) on the instance to enable several features. For example, setting a basic property value with set the lastUpdated property to the current `ecs` tick (used by query filters or features you make in Systems). Advanced Reference properties store the Component or Entity ids themselves regardless of whether you assign a string id or the instance, and return the instance with the getter when accessed as a kind of weak-reference.

There are also some built in properties:
  * entity: Entity instance that the component belongs to
  * id: string id of the component

<a name="componentConstructor"></a>
### constructor

Rather than initializing Components with the `new` keyword, use the ECS-Entity factory [ecs.createEntity](#ecsCreateEntity) or the Entity-Component factory [entity.addComponent](#entityAddComponent) instead.

<a name="componentGetObject"></a>
### getObject method

Returns an object of properties and values from the Component, including the id, ignoring any properties in the `definition.serialize.ignore` array. This object may be used as the intial values for a new Component with [ecs.createEntity](#ecsCreateEntity) or [entity.addComponent](#entityAddComponent).

<a name="componentStringify"></a>
### stringify method

The same as [component.getObject](#componentGetObject) but it returns a serialized version using [JSON.stringify](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify)

<a name="entity"></a>
## Entity

Entity instances keep references to its components, accessed with the property named after each Component type.

<a name="entityProperties"></a>
### Properties

 * ecs: ECS instance that the entity belongs to
 * id: string id of the entity
 * updatedComponents: tick of last when a component was added or removed
 * updatedValues: tick of last when a component property changed

Entities also have properties for each component type that has been added.

### Component Properties
<a name="entityComponentProperties"></a>

If the Component defintion has `many` set to false (the default), then you can access the component instance directly off of the component type name.

```js
entity.Position.x = 34; // set the value of x on the Position component of the entity
```

If the Component has `many` set to true, then the property will reference a `Set` of components

```js
for (const bonus of entity.Bonus) {
  console.log(bonus.hp);
}
```

If the Component has `many` to true and mapBy set to a property name, then the property will reference an `Object` with properties of the property of each component referenced by `mapBy`.

```js
ecs.registerComponent('EquipmentSlot', {
  properties: {
    slotName: 'hand',
    item: '<Entity>',
    open: true
  }
});

const entity = ecs.createEntity({
  EquipmentSlot: {
    legs: { open: true },
    body: { open: true },
    leftHand: { open: true },
    rightHand: { open: true }
  }
});

entity.addComponent('EquipmentSlot', {
  slotName: 'feet',
  open: false
});

entity.EquipmentSlot.leftHand.item = someOtherEntity;
console.log(EquipmentSlot.body.slotName); // "body"
console.log(EquipmentSlot.feet.open); // false
```

<a name="entityConstructor"></a>
### constructor

Rather than initializing Entities with the `new` keyword, use the ECS-Entity factory [ecs.createEntity](#ecsCreateEntity).

<a name="entityAddComponent"></a>
### addComponent method

A factory that creates a Component instance and applies it to the Entity instance. You can add set the initial values of the component.

__Arguments__:
  * [string] Component Type
  * [objected] initial values

👀 See the [ecs.registerComponent](#ecsRegisterComponent) and [ecs.createEntity](#ecsCreateEntity) sections for more details and examples.

<a name="entityRemoveComponentByType"></a>
### removeComponentByType method

Remove all Component instances from the Entity instance by the Component type name (string).

__Arguments__:
  * [string] Component type

<a name="entityAddTag"></a>
### addTag method

Adds a tag to the entity. Must have been registered.

__Arguments__:
  * [string] Tag

<a name="entityRemoveTag"></a>
### removeTag method

Removes a tag to the entity.

__Arguments__:
  * [string] Tag

<a name="entityHas"></a>
### has method

Checks to see if an entity has a given tag or component.

__Arguments__:
  * [string] Tag or Component name

returns: boolean

<a name="entityRemoveComponent"></a>
### removeComponent method

Remove a component from the Entity instance by instance or id.

__Arguments__:
  * [string] Component id or [Component instance]

<a name="entityGetObject"></a>
### getObject method

Returns an object of types with their proeprties and values, including the id, ignoring any properties in the `definition.serialize.ignore` array. This object may be used as the intial values for a new Component with [ecs.createEntity](#ecsCreateEntity) or [entity.addComponent](#entityAddComponent).

<a name="entityStringify"></a>
### stringify method

The same as [entity.getObject](#entityGetObject) but it returns a serialized version using [JSON.stringify](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify)

<a name="entityDestroy"></a>
### destroy method

Destroy the Entity instance, it's components, and removing any refrences to it or its components in other components. You will no longer be able to look up the Entity instance by id unless you make a new one with the same id.

<a name="system"></a>
## System

Systems are classes that you extend from ECS.System and override the update method to implement your system logic.

System classes can also have a `query` object with `has` and `hasnt` properties, and a `subcriptions` array of component type names or tags attached to the constructor/class.

Here is an example of a simple system:

```js
const ECS = require('@fritzy/ecs');

const ecs = new ECS.ECS();

ecs.registerComponent('Body', {
  properties: {
    mass: 1
  }
});
ecs.registerComponent('Position', {
  properties: {
    x: 0,
    y: 0,
    xVel: 0,
    yVel: 0
  }
});
ecs.registerComponent('Static', {
  properties: {}
});
ecs.registerComponent('Impulse', {
  properties: {
    x: 0,
    y: 0
  }
});

const ball = ecs.createEntity({
  Body: {},
  Position: { x: 100, y: -100 }
});
const peg = ecs.CreateEntity({
  Body: {},
  Position: { x: 100, y: -150 }
  Static: {}
});

class Gravity extends ECS.System {

  //feel free to override the constructor, but pass the first parameter to `super()`.
  constructor(ecs) {

    super(ecs);
  }

  update(tick, entities) {
    //tick is your current tick
    //entities is the result of your default query
    //you can run other queries as well by using this.ecs.queryEntities()
    //this.lastTick tells you the tick this system last ran

    for (const entity of entities) {
      entity.Position.yVel += .1;
      entity.Position.y += entity.Position.yVel;
    }

    //this.changes is an array of changes from your subscriptions
    for (const change of this.changes) {
      if (change.component.type !== 'Impulse') break;
      if (change.op !== 'addComponent') break;
      const impulse = change.component;
      const entity = change.component.entity;
      if (!entity.hasOwnProperty('Position')) break;
      j
      entity.Position.xVel += impulse.x;
      entity.Position.yVel += impulse.y;
      entity.removeComponent(component);
    }
    //the changes array is cleared every time the system is run
  }

}
// setting a query will give you a result set with every update
// the query results are kept up to date as enties are created, destroyed, add components, and remove components
Gravity.query = {
  has: ['Body', 'Position'],
  hasnt: ['Static']
};
// setting a subscription will result in a change log for those types
Gravity.subscriptions = ['Impulse'];

//you can pass addSystem the class or the instance
ecs.addSystem('physics', Gravity);

function update() {
  
  //you could store time delta information in an entity with a well-known id here
  ecs.runSystemGroup('physics');
  window.requestAnimationFrame(update);
}

window.requestAnimationFrame(update);
```

You'd likely have lots of systems, like one for rendering, one for gathering inputs and applying them, etc.

<a name="systemConstructor"></a>
### constructor

You can override the base System constructor, but it isn't necessary. If you do, be sure to pass the first argument to super.

__Arguments__:
  * [ECS] ecs instance

<a name="sysetmProperties"></a>
### Properties

  * ecs: ecs instance
  * lastTick: tick from the last time the system ran
  * changes: array of changes

<a name="systemChanges"></a>
### Changes

If you've set a `subscription` array on your system constructor (or class), then your `changes` property will start populating with changes as the component types that you've subscribed to are added and their properties change.

The changes array is cleared every time after the system runs.

Each change object has the following properties:
  * component: the component instance that changed
  * op: the operation name indicating what action took place
  * key: the name of the property or index that changed
  * old: the previous value of the property
  * value: the current value of the property

Possible operations:
  * addComponent: when the component is fully initialized (no key, old, or value)
  * setEntity: when an `<Entity>` property is set
  * setComponent: when a `<Component>` property is set
  * addEntitySet: when an `<EntitySet>` property is added to
  * deleteEntitySet: when an `<EntitySet>` property is deleted from
  * clearEntitySet: when an `<EntitySet>` property is cleared
  * addComponentSet: when an `<ComponentSet>` property is added to
  * deleteComponentSet: when an `<ComponentSet>` property is deleted from
  * clearComponentSet: when an `<ComponentSet>` property is cleared
  * setEntityObject: when a `<EntityObject>` property is set
  * deleteEntityObject: when a `<EntityObject>` property is deleted
  * setComponentObject: when a `<ComponentObject>` property is set
  * deleteComponentObject: when a `<ComponentObject>` property is deleted
  

<a name="systemUpdate"></a>
### update method

Called every time the system is run, override this method to write the behavior of the System. Don't call this yourself, instead use [ecs.runSystemGroup](#csRunSystem).

__Arguments__:
  * [number] current tick
  * [array of entity instances] entities resulting from query
