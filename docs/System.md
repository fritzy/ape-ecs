# System

Systems are where the work happens in ECS.


## creating

```js
class Gravity extends ApeECS.System {

  init() {
    // We're going to want a query that gives us Entitys that must have all of these Components at least.
    // We want it to be kept up to date, so we persist it.
    this.massesQuery = this.createQuery.fromAll('Position', 'Movement', 'Mass').persist();
    // Let's pretend we have an Entity with the id 'Frame' with a Component
    //  with a key called 'frameInfo' that has the deltaTime as property.
    // Cool.
    this.frameInfo = this.world.getEntity('Frame').frameInfo;
  }

  update(currentTick) {
    const entities = this.massesQuery.execute(); // get latest query results
    for (const entity of entities) {
      const position = entity.getOne('Position'); // we only expect to have one of these
      const movement = entity.getOne('Movement');
      position.y += movement.y;
      movement.x += 9.807 * this.frameInfo.deltaTime;
    }
  }
}

// Add Gravity to the 'EveryFrame' group -- a set of Systems that run every rendering frame.
// We made up the name 'EveryFrame'.
world.registerSystem('EveryFrame', Gravity);
```

## init

Method that runs when the System is first set up. It's meant for you to override and a good place to set up your queries, any subscriptions, and grab any evergreen `Entities`.

```js
class MoveTurn extends System {
  init() {
    this.moveActionsQuery = this.createQuery().fromAll('Character', 'MoveAction', 'Position').persist();
    this.map = this.world.getEntity('Map');
  }
  // ...
}
```

💭 Yeah, you could override the constructor and pass the arguments of to the super, but this approach is more stable across versions.

## world

This property is the world the System was registered in.

## update

The update method should be overridden. When the system is ran, it runs this method.

```js
class MoveTurn extends System {
 //...
 update(currentTick) {
   const characters = this.moveActionsQuery.execute();
   for (const character of characters) {
     for (const action of character.types['MoveAction']) {
       const newPos = {
         x: character.position.x + action.vector.x,
         y: character.position.y + action.vector.y
       };
       const coord = `${newPos.x}x${newPos.y}`;
       if (this.map.mainLayer.tiles.hasOwnProperty(coord)) {
         const tile = this.map.mainLayer.tiles[coord];
         if (!tile.has('Blocked')) {
           character.addComponent({
             type: 'MoveAnimation',
             ox: character.x,
             oy: character.y,
             nx: newPos.x,
             ny: newPos.y,
             startTick: currentTick
           });
           character.position.x = newPos.x;
           character.position.y = newPos.y;
         }
       }
       character.removeComponent(action);
     }
   }
 }
}
```

**Arguments**:
* currentTick: `Number`, integer, is passed to your update function when run. `world.currentTick`.

👆 The `system.changes` array is cleared after every time the update function runs, so you if you don't deal with the changes within your update function every time, you might miss some.

👆 Any persisted `Queries` created within your System will have their changes cleared after every time the `System` is run.

## createQuery

This method is a `Query` factory.

```js
class MoveTurn extends System {
  init() {
    this.moveActionsQuery = this.createQuery().fromAll('Character', 'MoveAction', 'Position').persist();
  }
}
```

**Arguments**:
* init: `Object`, _optional_, 👀 See the [Query Docs](./Query.md)

👀 You can also createQueries with the [world.createQuery factory method](./World.md#createquery) but you can not persist those queries or track their changes.

## Registering and Running

👀 See [world.registerSystem](./World.md#registersystem) for information on creating new Systems and registering them with the world.

## Tracking Query Changes

## Subscription Events
