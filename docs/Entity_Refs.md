# Entity References

**ApeECS** includes 3 types of Entity Reference -- a direct `EntityRef` and two Objects for references, `EntitySet` and `EntityObject`.
EntityRefs accept either `Entity` instances or their ids, and always return the `Entity` instance.
If the `Entity` instance is destroyed, then the references changes to `null`.
Entity References also facilitaty the [query.fromReverse](./Query.md#fromreverse) for finding Entities/Components that reference a given `Entity` instance through a specific `Component` type.
When you recreate Entities from serialized data, the Entity References are restored.

Entity references themselves are functions that set up the property.
Simply assign the function to a Component.properties value.

```js
class InventorySlot extends ApeECS.Component {
  static properties = {
    name: 'Right Hand',
    slotType: 'any',
    slot: ApeECS.EntityRef
  }
}
class Bottle extends ApeECS.Component {
  static properties = {
    liquid: 'water',
    amount: 1
  }
}

world.registerComponent(InventorySlot);
world.registerComponent(Bottle);
world.registerTags('Character');

const bottle = world.createEntity({
  components: [
    {
      type: 'Bottle',
      liquid: 'lava',
      amount: 0.75
    }
  ]
});

const npc = world.createEntity({
  tags: ['Character'],
  c: {
    rightHand: {
      type: 'InventorySlot',
    },
    leftHand: {
      type: 'InventorySlot',
    }
  }
});

npc.c.rightHand.slot = bottle;
console.log(npc.rightHand.slot === bottle); // true

const entities = world.creatQuery().fromAll('Character').fromReverse(bottle, 'InventorySlot').execute();
const entity = [...entities][0];
assert(entity === npc);
bottle.destroy();
console.log(npc.rightHand.slot === null); // true
```

## EntityRef

`Component` property factory function for defining a single Entity reference.
Assign `Entity` instances, `Entity` ids, or `null` to this property.
Serializes to the `Entity` id.

## EntityObject

`Component` property factory that creates a `Proxy` Object on that property where every key is effectively an `EntityRef`.
Serializes to an `Object` of `Entity` ids and restores back to an `EntityObject`.

```js
class CarParts extends ApeECS.Component {
  static properties = {
    mountPoints: ApeECS.EntityObject
  };
}
world.registerComponents(CarParts)

const car = world.creatEntity({
  c: {
    carParts: {
      type: 'CarParts'
    }
  }
});

// assume we have an entity coilovers;
car.carParts.mountPoints.shocks = coilovers;
// assume we have an entity sportTires;
car.carParts.mountPoints.tires = sportTires;

console.log(JSON.stringify(car.getObject));
```
```json
{
  "id": "lkajdsf-132",
  "tags": [],
  "c": {
    "carParts": {
      "id": "lfjffff0-12",
      "type": "CarParts",
      "mountPoints": {
        "shocks": "ffdadfdas-32",
        "tires": "ujfjsjf-44"
      }
    }
  }
}
```

## EntitySet

`Component` property factory that creates a `Set` that manages Entity references.

```js
class Inventory extends ApeECS.Component {
  static properties: {
    slots: ApeECS.EntitySet
  }
}
world.registerComponent(Inventory);

const npc = world.createEntity({
  c: {
    inventory: {
      type: 'Inventory'
    }
  }
});

// assume we have a bottle entity
npc.inventory.slots.add(bottle);
console.log(npc.inventory.slots.has(bottle)); // true
console.log(npc.inventory.slots.has(bottle.id)); // true
bottle.destroy();
console.log(npc.inventory.slots.has(bottle)); // false
```

