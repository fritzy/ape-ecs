class System {

  constructor(ecs) {

    this.ecs = ecs;
    this.changes = [];
    this.lastTick = this.ecs.ticks;
    /* $lab:coverage:off$ */
    if (this.constructor.query && (this.constructor.query.has || this.constructor.query.hasnt)) {
    /* $lab:coverage:on$ */
      const query = { persist: this, ... this.constructor.query };
      this.ecs.queryEntities(query);
      this.query = this.ecs.queryCache.get(this);
    }
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
