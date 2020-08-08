# Component

Components are the datatypes we use in the Entity-Component-System paradigm (ECS).
In **Ape ECS**, Components are single shallow Objects managed by JS classes.
Those properties can be JavaScript types and special Entity Reference values.

```js
class EquipmentSlot extends ApeECS.Component {

  static parameters = {
    name: 'Right Hand',
    slotType: 'wieldable',
    slot: ApeECS.EntityRef
  };

  //default
  static serialize = true;
  // defaults to null, which behaves the same as all fields like this
  static serializeFields = ['name', 'slotType', 'slot']; 

  init(values) {
  }

  preDestroy() {
  }
}
```

👀 See the [World registerComponent documentation](./World.md#registercomponent) for information on how to define a new Component type.

👀 See the [Entity Ref Docs](./Refs.md) for more on Entity Reference properties.

Components can only exist when they're part of an Entity.
You can have any number of the same Component type within an Entity.
You create instances of a Component either by defining them within [world.createEnitity](./World.md#createentity), [world.createEntities](./World.md#createentities), or [entity.addComponent](./Entity.md#addcomponent).
Component instances are destroyed through [component.destroy](#destroy) or [entity.removeComponent](./Entity.md#removecomponent).

Component property values can be accessed and changed directly on the Component instance like any other object.

⚠️ You _should_ run [component.update()](#update) after you update properties on a `Component`, or update those properties by passing an object with your new values to `component.update()`. Currently, the only consequences for not calling this method are:
* `component.updated` won't be updated to the current tick
* `entity.updatedValues` won't be updated to the current tick
* Query filters by `lastUpdated` won't be accurate.

In future versions, there may be more features tied to this functionality.

## Creating Component Instances

There are a few factory functions for creating Components. When you create `Entities` you can include the initial components and their values.

* [world.createEntity](./World.md#createentity)
* [world.createEntities](./World.md#createentities)

Or you can add them on to an existing `Entity`.
* [entity.addComponent](./Entity.md#addcomponent)

Regardless of the method you use to create a `Component`, the format is as follows:

```js
{
  type: 'Position', // Component Type
  id: 'hi-there', // optional, unique id, auto generated if not provided
  lookup: 'position', // optional, if set you can access the component by this value from the Entity instance
  // see below for more on lookups
  x: 34, // set the initial value of any property defined when registered
  y: 3 // another property that you previously defined
  // you don't have to assign values to all of your properties
}
```

📑 Related, you can always add `Tags`, which are similar to Components, except they're just the name/type. [entity.addTag](./Entity.md#addtag)

☝️ `Components` can't exist without being part of an `Entity`. A future release may add more ways to use `Components.`

💭 `Components` are pooled by their type. When you [world.registerComponent](./World.md#registercomponent), set a pool size close to the number of a given type you expect to exist at a time. The `Component` pools add some efficiency, and lowers the amount of CPU time the JavaScript [garbage collector](https://en.wikipedia.org/wiki/Garbage_collection_(computer_science)) needs.

## id

The id property of a `Component` is a `String` that has generally been auto-generated.

⚠️ Do not reassign the id of an `Entity` or `Component` after they have been created. Here there be dragons. 🐉

## properties

You can access any property directly on a `Component` instance that you have registered with the component.

See the [example](#example) at the [top of this document](#component).

⚠️ If you assign any new properties to a `Component` that you didn't register, they won't behave properly.

⚠️ When you override a `Component` method, be wary of inserting game logic to Components as it quickly turns your game into an `EC` game rather than an ECS. You'll lose some of the benefits of this approach. You might also make logic that limits you in the future, like the ability to run the same Components on a server and a client. Keep your game logic in your `Systems` and override `Component` methods only for data formatting and access.

For example, if you have a game engine sprite, you might have a Component that contains all of the necessary information to stand up a sprite, and a reference to the game engine sprite instance itself. When you store the sprite you may need to remove the sprite instance from the Component, because it can't be serialized. You can do that by overriding `getObject`. But resist the tempation to re-create the game engine sprite in `init`. That won't work on your server. Instead, tag any new Entitys that have an unititialized Sprite `Component` with "New" or "NewSprite". You can then have a `System` `Query` that checks for `Query.fromAll(['Sprite', 'New'])` to initialize it for you.

## lookup

Setting the lookup property will map the `Component` within its `Entity` by that value for convenience in addition to the set of Components of that type within the `entity.components['ComponentTypeNameHere']` `Set`.

```js
const entity = world.createEntity({
  components: [
    {
      type: 'Position',
      lookup: 'position',
      x: 3,
      y: 10
    }
  ]
});

console.log(entity.position.x); // 3

for (const position of entity.types.Position) {
  console.log(position.x, position.y);
}
// 3 10
```

You can also set the lookup in an `Entity` creation factory the `c` property.

This is equivalant to the above:
```js
const entity = world.createEntity({
  c: {
    position: {
      type: 'Position',
      x: 3,
      y: 10
    }
  }
});
```

## entity

The entity property gives you access to the parent `Entity` instance.

## getObject

Get a serializable version of the Component.

```js
const obj = component.getObject();
console.log(obj);
```
```js
{
  type: 'Point', // component type name
  id: 'aabbbcc-37', // generated or assigned component id
  entityId: 'kjasdlf-03', // generated or assigned entity id
  lookup: 'point', // assigned lookup, if set
  x: 38, // any properties that you registered
  y: 44
}
```

☝️ If you have a static array for `serializeFields`, then only those fields will be in the resulting object.

☝️ You can use the results of `component.getObject` as the component in [entity.addComponent](./Entity.md#addcomponent) and as a component part in [world.createEntity](./World.md#createentity) and [world.createEntities](./World.md#createentities).

💭 `getObject` will grab `meta.values` for a given property, if available.

💭 `component.getObject` is called by [entity.getObject](./Entity.md#getobject) and [world.getObject](./World.md#getobject) unless you specify the static property `serialize = false` on the Component class.


## destroy

Destroy the component.

```js
someComponent.destroy();
```

Before any other actions are taken, the `init` function you can define in [world.registerComponent](./World.md#registercomponent) is ran if specified.

💭 This has the same effect as [entity.removeComponent](./Entity.md#removecomponent). This clears all the data in the component and releases it back to the `Component` pool of its type.

