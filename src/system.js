const Query = require('./query');

class System {

  constructor(world) {

    this.world = world;
    this._stagedChanges = [];
    this.changes = [];
    this.queries = [];
    this.lastTick = this.world.currentTick;
    if (this.constructor.subscriptions) {
      for (const sub of this.constructor.subscriptions) {
        this.world.subscribe(this, sub);
      }
    }
    this.init();
  }

  init() {

  }

  update(tick) {

  }

  createQuery(init) {

    return new Query(this.world, this, init);
  }

  _preUpdate() {

    this.changes = this._stagedChanges;
    this._stagedChanges = [];
  }

  _postUpdate() {

    for (const query of this.queries) {
      query.clearChanges();
    }
    this.world.entityPool.release();
    this.world.updateIndexes();
  }

  _recvChange(change) {

    this._stagedChanges.push(change);
  }

}

module.exports = System;
