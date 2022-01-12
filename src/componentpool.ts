import { World } from './world';
import Entity from './entity';
import { Component } from './component';

export default class ComponentPool {

  registry: any;
  type: string;
  klass: any;
  pool: any[];
  targetSize: number;
  active: number;

  constructor(registry, type, spinup) {
    this.registry = registry;
    this.type = type;
    this.klass = this.registry.types[this.type];
    this.pool = [];
    this.targetSize = spinup;
    this.active = 0;
    this.spinUp(spinup);
  }

  get(world: World, entity: Entity, initial: object) {
    let comp;
    if (this.pool.length === 0) {
      comp = new this.klass();
    } else {
      comp = this.pool.pop();
    }
    comp._setup(world, entity, initial);
    comp.init(initial);
    this.active++;
    return comp;
  }

  release(comp: Component) {
    comp._reset();
    //comp._meta.entity = null;
    this.pool.push(comp);
    this.active--;
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

  spinUp(count: number) {
    for (let i = 0; i < count; i++) {
      const comp = new this.klass();
      this.pool.push(comp);
    }
    this.targetSize = Math.max(this.targetSize, this.pool.length);
  }
}
