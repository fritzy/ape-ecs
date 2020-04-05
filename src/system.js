class System {

  constructor(ecs) {

    this.ecs = ecs;
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

  _sendChange(change) {

    this.changes.push(change);
  }

  destroy() {
  }

}

module.exports = System;
