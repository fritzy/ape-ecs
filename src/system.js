const Query = require('./query');

class System {
  constructor(world, ...initArgs) {
    this.world = world;
    this.queries = [];
    this.lastTick = this.world.currentTick;
    this.init(...initArgs);
  }

  init() {}

  update(tick) {}

  createQuery(query) {
    return new Query(this.world, { system: this, ...query });
  }

  _preUpdate() {
    this.world.updateIndexes();
  }

  _postUpdate() {
    for (const query of this.queries) {
      query.clearChanges();
    }
  }

}

module.exports = System;
