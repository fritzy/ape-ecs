const System = require('./system');

class CleanupApeDestroySystem extends System {
  init() {
    this.destroyQuery = this.createQuery({
      includeApeDestroy: true,
      all: ['ApeDestroy']
    });
  }

  update() {
    const entities = this.destroyQuery.run();
    for (const entity of entities) {
      entity.destroy();
    }
  }
}

function setupApeDestroy(world) {
  world.registerTags('ApeDestroy');
  world.registerSystem('ApeCleanup', CleanupApeDestroySystem);
}

module.exports = setupApeDestroy;
