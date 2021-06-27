# Patterns

Some helpful patterns to using Ape ECS.
Contributions encouraged!

## Input and Intentions

One of the great things about the ECS pattern is that not everything needs to be in the ECS registry itself.
Feel free to use external libraries and tools for things like mapping, graphics, and input, but it should interface with the ECS game state in some way.

In the case of input, it's nice to attach an action component to an entity.
Those actions could come from user input or NPC AI or network.

```js
class Position extends ApeECS.Component {}
Position.properties = {
  x: 0,
  y: 0
};

// we could just make a separate action for each direction as tags
// but this is more flexible
class ActionMove extends ApeECS.Component {}
ActionMove.properties = {
  x: 0,
  y: 0
};

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

TODO 

## Globals and GameLoop

TODO

## Function-Only Systems

You don't have to use the build in [world.registerSystem](./World.md#registersystem) or [world.runSystems](./World.md#runsystems).
Instead, you can just use a function as a system, run queries within it, and update your entities.
You will not, however, be able to use persistant (index) queries, nor keep track of query changes, as you can with System Queries [system.createQuery](./System.md#createquery).

```js
function gravity(world) {

  const frameInfo = world.getEntity('GameLoop')
    .getOne('FrameInfo');
  const entities = world.createQuery()
    .fromAll('Position', 'Vector')
    .execute();
  for (const entity of entities) {
    const vector = entity.getOne('Vector');
    vector.y += frameInfo.deltaTime * 9.807;
    vector.update();
  }
}
```

## Turn Ticks vs. Frame ticks

TODO

## ApeDestroy

TODO

## Actions

Action systems allow entities to respond to events. For example, an entity could perform an action when the player presses a key, or could perform an action when the player steps on a button.

Registering a seperate component and system for each action can be tedious. By using an action registry, the component and system can be generated by template code.

```js
import { System, Component } from 'ape-ecs';

// the action registry
export class ActionRegistry {
    constructor(world) {
        this.world = world;
    }

    register_action(action_config) {
        let { action_name, action_setting_properties, on_system_config, on_entity_action } = action_config;

        // Generate a class and register it as a component for the action itself
        let Action = class extends Component {
            static get typeName() { return action_name; }//webpack decided not to work with static properties, so I get to do this stupid thing.
            static get properties() { return { action_key: '' } }//webpack decided not to work with static properties, so I get to do this stupid thing.
        }
        this.world.registerComponent(Action);

        // Generate a class and register it as a component for any settings inherent to the action
        let ActionSettings = class extends Component {
            static get typeName() { return action_name + 'Settings'; }//webpack decided not to work with static properties, so I get to do this stupid thing.
            static get properties() { return Object.assign(action_setting_properties, { action_key: '' }); }//webpack decided not to work with static properties, so I get to do this stupid thing.
        }
        this.world.registerComponent(ActionSettings);

        // Generate a class and register it as a system for the consequences of an action being performed
        let ActionSystem = class ActionSystemClass extends System {
            init() {
                // set up the actors query
                this.actors_query = this.createQuery().fromAll(action_name);
                on_system_config(this);// set up any additional queries
            }
            update(currentTick) {
                // fetch the actors and iterate through them
                const actors = this.actors_query.refresh().execute();
                for (let actor of actors) {
                    let actions = actor.getComponents(action_name);

                    // iterate through the instances of the action
                    for (let action of actions) {
                        // find any settings that match this action. Filter for the one with the appropriate key.
                        let settings = Array.from(actor.getComponents(action_name + 'Settings'));
                        let specific_setting = settings.find(ele => ele.action_key == action.action_key);
                        on_entity_action(this, actor, action, specific_setting);
                    }
                    
                }
            }
        }
        this.world.registerSystem('frame', ActionSystem);

        // Return the classes for later use if you need them.
        return [ Action, ActionSettings ];
    }
}

//create an action registry
let action_registry = new ActionRegistry(world);

//register the fireProjectile action
let [FireProjectile, FireProjectileSettings] = action_registry.register_action({
    action_name: 'FireProjectile',
    action_setting_properties: {
        target: EntityRef,
        image: './assets/stub.png'
    },
    on_system_config: (system) => {// set up queries
        console.log('no queries!');
    },
    on_entity_action: (system, entity, action, settings) => {// perform the action
        if (!settings) {
            console.log('no settings for FireProjectile.');
            entity.removeComponent(action);
            return;
        }

        console.log('fired')

        // originate the projectile at the entity that acted. 
        let location = entity.getOne('Location');
        let target = settings.target.getOne('Location');
        
        // create the projectile. Assume location, image, and destination components.
        world.createEntity({
            components: [
                {
                    type: 'Location',
                    x: location.x,
                    y: location.y,
                },
                {
                    type: 'Image',
                    path: settings.image
                },
                {
                    type: 'Destination',
                    x: target.x,
                    y: target.y
                }
            ]
        })

        // remove the FireProjectile component
        entity.removeComponent(action);
    }
});
```
