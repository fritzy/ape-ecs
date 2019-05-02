class System {

  constructor(ecs) {

    this.ecs = ecs;
    this.changes = [];
    this.lastTick = this.ecs.ticks;
  }

  setQuery(has, hasnt) {

    args.cache = this;
    this.ecs.queryEntities(args);
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
