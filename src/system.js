class System {

  constructor(ecs, query) {

    this.ecs = ecs;
    this.changes = [];
    this.lastTick = this.ecs.ticks;
    this.query = query;
    if (this.query) {
      this.query.persist = this;
      this.ecs.queryEntities(this.query);
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
