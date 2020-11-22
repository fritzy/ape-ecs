const Entity = require('./entity');

class EntityPool {
  constructor(world, spinup) {
    this.world = world;
    this.pool = [];
    this.destroyed = [];
    this.worldEntity = class WorldEntity extends Entity {};
    this.worldEntity.prototype.world = this.world;
    this.spinUp(spinup);
    this.targetSize = spinup;
  }

  destroy(entity) {
    this.destroyed.push(entity);
  }

  get(definition, onlyComponents = false) {
    let entity;
    if (this.pool.length === 0) {
      entity = new this.worldEntity();
    } else {
      entity = this.pool.pop();
    }
    entity._setup(definition, onlyComponents);
    return entity;
  }

  release() {
    while (this.destroyed.length > 0) {
      const entity = this.destroyed.pop();
      this.pool.push(entity);
    }
  }

  cleanup() {
    if (this.pool.length > this.targetSize * 2) {
      const diff = this.pool.length - this.targetSize;
      const chunk = Math.max(Math.min(20, diff), Math.floor(diff / 4));
      for (let i = 0; i < chunk; i++) {
        this.pool.pop();
      }
    }
  }

  spinUp(count) {
    for (let i = 0; i < count; i++) {
      const entity = new this.worldEntity();
      this.pool.push(entity);
    }
    this.targetSize = Math.max(this.targetSize, this.pool.length);
  }
}

module.exports = EntityPool;
