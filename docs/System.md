# System

Systems are where the work happens in ECS.


## creating

```js
class Gravity extends ApeECS.System {

  init() {
    // We're going to want a query that gives us Entitys that must have all of these Components at least.
    // We want it to be kept up to date, so we persist it.
    this.massesQuery = this.createQuery.fromAll(['Position', 'Movement', 'Mass']).persist();
  }

  update(currentTick) {
    // Let's pretend we have an Entity with the id 'Frame' with a Component
    //  with a lookup called 'frameInfo' that has the deltaTime as property.
    // Cool.
    const deltaTime = this.world.getEntity('Frame').frameInfo.deltaTime;
    const entities = this.massesQuery.execute(); // get latest query results
    for (const entity of entities) {
      const position = entity.getOne('Position'); // we only expect to have one of these
      const movement = entity.getOne('Movement');
      position.y += movement.y;
      movement.x += 9.807 * deltaTime;
    }
  }
}

// Add Gravity to the 'EveryFrame' group -- a set of Systems that run every rendering frame.
// We made up the name 'EveryFrame'.
world.registerSystem('EveryFrame', Gravity);
```

## init

## world

## update

## createQuery

## Registering and Running

## Tracking Query Changes

## Subscription Events