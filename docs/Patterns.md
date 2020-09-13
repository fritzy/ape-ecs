# Patterns

## Input and Intentions

One of the great things about the ECS pattern is that not everything needs to be in the ECS registry itself.
Feel free to use external libraries and tools for things like mapping, graphics, and input, but it should interface with the ECS game state in some way.

In the case of input, it's nice to attach an action component to an entity.
Those actions could come from user input or NPC AI or network.

```js
class Position extends ApeECS.Component {
  static properties = {
    x: 0,
    y: 0
  }
}

// we could just make a separate action for each direction as tags
// but this is more flexible
class ActionMove extends ApeECS.Component {
  static properties = {
    x: 0,
    y: 0
  }
}

class ActionSystem extends ApeECS.System {

  init() {

    // here we're just dealing with movement, but an action could be any action
    // that a player or game agent intends to take

    this.moveQuery = this.createQuery()
      .fromAll('MoveAction', 'Position');
  }

  update(tick) {

    const entities = this.moveQuery.execute();
    for (const entity of entities) {
      // getOne because we only expect one Position on an entity
      const pos = entity.getOne('Position');
      for (const move of entity.getComponents('MoveAction')) {

        // You would probably check to make sure they can move that direction
        // but I leave that as an exercise for the reader.
        // You might also want to attach animations for an animation system here.

        // You could just directly manipulation pos.x, pos.y but we won't get
        // proper information on mutations that way.
        // You could also directly update pos.x and pos.y and then call
        // pos.update() without arguments.
        pos.update({
          x: pos.x + move.x,
          y: pos.y + move.y
        });
        // remove the used action
        entity.removeComponent(move);
      }
    }
  }
}

class GameLoop {

  constructor() {

    this.world = new ApeECS.World();
    //register your components
    this.world.registerComponent(Position, 10);
    this.world.registerComponent(ActionMove, 10);
    this.world.registerTags('Character', 'PlayerControlled');
    this.world.registerSystem('everyframe', ActionSystem);

    this.playerQuery = this.world.createQuery().fromAll('PlayerControlled', 'MoveAction');
    window.addEventListener('keydown', (e) => {
      // refresh, because the query is used more than once, and is not a system+persisted query
      const entities = this.playerQuery.refresh().execute();
      // maybe your controls move more than one character
      for (const player of entities) {
        switch (e.code) {
          case 'KeyUp':
            player.addComponent({
              type: 'ActionMove',
              y: -1
            });
            break;
          case 'KeyDown':
            player.addComponent({
              type: 'ActionMove',
              y: 1
            });
            break;
          case 'KeyLeft':
            player.addComponent({
              type: 'ActionMove',
              x: -1
            });
            break;
          case 'KeyRight':
            player.addComponent({
              type: 'ActionMove',
              x: 1
            });
            break;
        }
      }
    });

    window.requestAnimationFrame(this.update.bind(this));
  }

  update(time) {

    window.requestAnimationFrame(this.update.bind(this));
    // in a turn-based game, you might have animations run every frame
    // but you might have turn systems run only if there has been user input
    // but here we we naively only have one system group and run them all
    // every time
    this.world.runSystems('everyframe');
    this.world.tick();
  }
}
```

## Two Ways of Doing Inventory with Entity References

## Globals and GameLoop

## Function-Only Systems

## Turn Ticks vs. Frame ticks

## ApeDestroy
