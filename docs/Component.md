# Component

Components are the datatypes we use in ECS.
In **Ape ECS** Components are single shallow Objects with predefined properties.
Those properties can reference JavaScript types and special Entity Reference values.

👀 See the [Entity Ref Docs](./Refs.md) for more on Entity Reference properties.

👀 See the [World registerComponent documentation](./World.md#registercomponent) for information on how to define a new Component type.

Components can only exist when they're part of an Entity.
You can have any number of the same Component type within an Entity.
You create instances of a Component either by defining them within [world.createEnitity](./World.md#createentity), [world.createEntities](./World.md#createentities), or [entity.addComponent](./Entity.md#addcomponent).
Component instances are destroyed through [component.destroy](#destroy) or [entity.removeComponent](./Entity.md#removecomponent).

Component property values can be accessed and changed directly on the Component instance like any other object.

️⚠️ Due to an optimization, Component properties are not reflected through introspection, like `console.log`, but they're there if you defined them with `world.registerComponent`. Properties are actually getter/setters on the Component prototype and stored within `component._meta.values`, so you can't enumerate them or inspect them directly.

```js
world.registerComponent('Position', {
  properties: {
    x: 0,
    y: 0
  }
}, 10);

world.registerComponent('Buff', {
  properties: {
    armor: 10
  }
}, 10);

const entity = world.createEntity({
  components: [
    {
      type: 'Buff',
      armor: 10
    }
    {
      type: 'Buff',
      armor: 3
    }
  ],
  c: {
  Position: 
    x: 3,
    y: 28
  }
});

console.log(entity.Position.x, entity.Position.y); // 3  28
entity.Position.x = 13;
entity.Position.y = 4;
console.log(entity.Position.x, entity.Position.y); // 13  4
for (const buff of entity.types.Buff) {
  console.log(buff.armor);
}
// 10
// 3
console.log(entity.getObject());
/*
{
  id: 'aaabbbccc-32',
  tags: [],
  components: [
    {
      id: 'lkjasdf-2',
      type: 'Buff',
      armor: 10
    },
    {
      id: 'lkjasdf-3',
      type: 'Buff',
      armor: 3
    }
  ],
  c: {
    Position: {
      id: 'lkjasdf-4',
      type: 'Position',
      lookup: 'Position',
      x: 13,
      y: 4
    }
  }
}
*/
```

## constructor

## lookup

## entity

## getObject

## destroy
