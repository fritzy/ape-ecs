# Entity

Entities are collections of `Component` and tags, with their own id.
They are the main unit in your game/simulation, and can be dynamically constructed and changed.

You can create entities with the factories [world.createEntity](./World.md#createentity) and [world.createEntities](./World.md#createentities).

Your results from a [Query](./Query.md) will be a `Set` of `Entities`.

You can check to see if a given entity has at least one of a given `Component` type or `tag` with [entity.has](#has).
You can iterate through all of the instance of a given `Component` type within an entity with the [types property](#types). Any `Component` that has its [lookup property](./Component.md#lookup) set will be available as a property directly on the `Entity` instance.

At any point, you can dyamically [entity.addComponent](#addcomponent) and [entity.removeComponent](#removecomponent) at any point.

```js
world.registerComponent('Position', {
  properties: {
    x: 0,
    y: 0
  }
});

const entity = world.createEntity({
  c: {
    position: {
      type: 'Position',
      x: 20,
      y: 7
    }
  }
})

console.log(entity.has('Position')); // true
```

## creating

You create `Entity` instances through factory functions.

👀 See [world.createEntity](./World.md#createentity) and [world.createEntities](./World.md#createentities).

## id

The `id` property of an `Entity` may have been specified upon creation, but is generally auto-generated.

⚠️ Do not reassign the id of an `Entity` or `Component` after they have been created. Here there be dragons. 🐉

## types

The `types` property is an Object with the key indicating the `Component` types that are attached to this `Entity`.
Each value is a `Set` of `Component` instances.

```js
for (const ctype of Object.keys(entity.types)) { 
  for (const component of entities.types[ctype]) {
    console.log(`Type <${ctype}> Id: ${component.id}`);
  }
}
```

## has

The `has` method returns a `boolean` based on whether the `Entity` has a `Component` of that type or a tag of that name.

```js
entity.has('Point'); // true or false
```

**Arguments**:
* type: `String`, _required_

**Returns**: `Boolean`

## getComponents

Returns a `Set` of `Components` of a given type.

```js
const pointsSet = entity.getComponents('Point');
```

## addTag

Adds a tag to the `Entity`.

```js
entity.addTag('Invisible');
```

⚠️ Tags must be registered with [world.addTag](./World.md#addtag) before use.

## removeTag

Removes a tag frmo the `Entity`.

```js
entity.removeTag('Invisible');
```

## addComponent

Creates a new `Component` instance of a given type and adds it to the `Entity`.

```js
entity.addComponent({
  type: 'Point', //required
  label: 'point', //optional
  id: 'asdf-1' //optional -- don't do this unless you're restoring
  x: 123, // set the initial values of properties previously registered
  y: 321
  // feel free to not set all of the properties for defaults
});
```

Setting a label makes the `Component` instance accessible as a property of the `Entity`.

💭 It can sometimes be useful to set a custom id for an `Entity`, but there may not be a valid usecase for a new `Component`. You should generally only specify the `id` in `addComponent` if you're restoring a previous `Component` from `getObject`.

👀 See [world.createEntity](./World.md#createEntity) for another perspective on `Component` instance definitions.

## removeComponent

Removes and destroys an existing `Component` instance from the `Entity`.

```js
entity.removeComponent('someId');
```

```js
for (const component of entity.getComponents('Buff')) {
  entity.removeComponent(component);
  // alternatively, component.destroy();
}
```

**Arguments:**
* id/component: `String` of the component id or `Component` instance.

## getObject

Generates a serializable `Object` of the `Entity` instance, including all of its `Components`.

```js
const obj = entity.getObject();

console.log(obj)
```
```js
{
  id: 'lkjsadf-34',
  tags: ['Visible'],
  components: [ //anything without a label will be in components
    {
      id: 'fffff-39',
      type: 'Buff',
      name: 'Stone Skin',
      stat: 'armor',
      amount: 5
    },
    {
      id: 'fffff-40',
      type: 'Buff',
      stat: 'charisma',
      name: 'Nice Haircut',
      amount: 1
    },
    {
      id: 'qeruj-9',
      type: 'Sprite',
      texture: 'assets/sprites/mean-face.png',
      pixiSprite: null
    }
  ],
  c: { //anything will a label will end up under c
    point: {
      id: 'asdlfkj-9334',
      type: 'Point',
      x: 34,
      y: 109
    }
  }
}
```

The returning object includes the `Entity` id, tags, array of Components, and an object called "c" with labeled `Components`.

👆 You can use this resulting Object to save state and restore with `world.createEntity` later.

👀 See also [world.getObject](World.md#getobject) and [component.getObject](./Component.md#getobject).

💭 `world.getObject` calls this method on all entities to geneate it's result. This method calls all of its `Components` `getObject` to get its result.

## destroy

Destroys an `Entity` and all of its `Components`.

```js
entity.destroy();
```