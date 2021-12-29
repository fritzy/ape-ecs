import { System } from './system';
export const Query = require('./query.js');

class CleanupApeDestroySystem extends System {

  destroyQuery: typeof Query;

  init() {
    this.destroyQuery = this.createQuery({
      includeApeDestroy: true,
      all: ['ApeDestroy']
    });
  }

  update() {
    const entities = this.destroyQuery.run();
    for (const entity of entities) {
      entity.destroy(true);
    }
  }
}

export default function setupApeDestroy(world) {
  if (!world.registry.typeset.has('ApeDestroy')) {
    world.registerTags('ApeDestroy');
  }
  world.registerSystem('ApeCleanup', CleanupApeDestroySystem);
}

//module.exports = setupApeDestroy;
