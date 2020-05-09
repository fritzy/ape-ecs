class System {

  constructor(ecs) {

    this.ecs = ecs;
    this._stagedChanges = [];
    this.changes = [];
    this.lastTick = this.ecs.ticks;
    if (this.constructor.subscriptions) {
      for (const sub of this.constructor.subscriptions) {
        this.ecs.subscribe(this, sub);
      }
    }
  }

  update(tick, entities) {

  }

  _preUpdate() {

    this.changes = this._stagedChanges;
    this._stagedChanges = [];
  }

  _postUpdate() {
  }

  _recvChange(change) {

    this._stagedChanges.push(change);
  }

  destroy() {
  }

}

module.exports = System;
