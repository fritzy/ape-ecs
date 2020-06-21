const Entity = require('./entity');

class EntityPool {

  constructor(world, spinup=0) {

    this.world = world;
    this.pool = [];
    this.worldEntity = class WorldEntity extends Entity {};
    this.worldEntity.prototype.world = this.world;
    this.spinUp(spinup);
  }

  get(definition) {

    let entity;
    if (this.pool.length === 0) {
      entity = new this.worldEntity();
    } else {
      entity = this.pool.pop();
    }
    entity._setup(definition);
    return entity;
  }

  release(entity) {

    this.pool.push(entity);
  }

  spinUp(count) {

    for(let i = 0; i < count; i++) {
      const entity = new this.worldEntity();
      this.pool.push(entity);
    }
  }
}

module.exports = EntityPool;
