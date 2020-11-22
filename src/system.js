const Query = require('./query');

class System {
  constructor(world, ...initArgs) {
    this.world = world;
    this._stagedChanges = [];
    this.changes = [];
    this.queries = [];
    this.lastTick = this.world.currentTick;
    if (this.constructor.subscriptions) {
      for (const sub of this.constructor.subscriptions) {
        this.subscribe(sub);
      }
    }
    this.init(...initArgs);
  }

  init() {}

  update(tick) {}

  createQuery(init) {
    return new Query(this.world, this, init);
  }

  subscribe(type) {
    if (typeof type !== 'string') {
      type = type.name;
    }
    if (!this.world.subscriptions.has(type)) {
      this.world.componentTypes[type].subbed = true;
      this.world.subscriptions.set(type, new Set());
    }
    this.world.subscriptions.get(type).add(this);
  }

  _preUpdate() {
    this.changes = this._stagedChanges;
    this._stagedChanges = [];
    this.world.updateIndexes();
  }

  _postUpdate() {
    for (const query of this.queries) {
      query.clearChanges();
    }
  }

  _recvChange(change) {
    this._stagedChanges.push(change);
  }
}

module.exports = System;
