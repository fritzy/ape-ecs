import Entity from './entity';
import { World } from './world';

export default class EntityPool {

  world: World;
  pool: Entity[];
  destroyed: Entity[];
  targetSize: number;

  constructor(world, spinup) {
    this.world = world;
    this.pool = [];
    this.destroyed = [];
    this.spinUp(spinup);
    this.targetSize = spinup;
  }

  destroy(entity) {
    this.destroyed.push(entity);
  }

  get(definition, onlyComponents = false) {
    let entity;
    if (this.pool.length === 0) {
      entity = new Entity();
    } else {
      entity = this.pool.pop();
    }
    entity._setup(this.world, definition, onlyComponents);
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
      const entity = new Entity();
      this.pool.push(entity);
    }
    this.targetSize = Math.max(this.targetSize, this.pool.length);
  }
}
