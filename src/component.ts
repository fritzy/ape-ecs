import { IdGenerator } from './util';
const idGen = new IdGenerator();

import { World } from './world';
import Entity from './entity';

export class Component {

  static properties?: null | object = null;
  static serialize?: boolean = true;
  static serializeFields? : null | string[] = null;
  world: World;
  id: null | string;
  lastTick: number;
  entity: Entity;
  _key: string;

  constructor() {
    this.world = null;
    this.id = null;
    this.lastTick = 0;
  }

  _reset() {
    this.world = null;
    this.id = null;
    this.lastTick = 0;
    this.clear();
  }

  clear() {
    for (const prop of Object.keys((this.constructor as typeof Component).properties)) {
      this[prop] = undefined;
    }
  }

  _setup(world, entity, initial) {
    this.world = world;
    this.entity = entity;
    const values = { ...(this.constructor as typeof Component).properties, ...initial };
    this.id = initial.id || idGen.genId();
    this.key = initial.key || this.id;
    this.update(values);
    this.world.componentsById.set(this.id, this);
  }

  init(initial) {
  }

  update(values) {
    if (values !== undefined) {
      for (const prop of Object.keys(values)) {
        if ((this.constructor as typeof Component).properties.hasOwnProperty(prop)) {
          this[prop] = values[prop];
        }
      }
    }
    this.entity.updatedValues = this.lastTick = this.world.currentTick;
  }

  get key(): string {
    return this._key;
  }

  set key(value: string) {
    this.entity?.c[this.type]?.updateKey?.(this, this._key, value);
    this._key = value;
  }

  get type() {
    return this.constructor.name;
  }

  getObject() {
    const obj = {
      id: this.id,
      type: this.type,
      entity: this?.entity?.id,
      key: this._key
    }
    if ((this.constructor as typeof Component).serializeFields !== null) {
      for (const prop of (this.constructor as typeof Component).serializeFields) {
        obj[prop] = this[prop];
      }
    } else {
      for (const prop of Object.keys((this.constructor as typeof Component).properties)) {
        obj[prop] = this[prop];
      }
    }
    return obj;
  }

  destroy() {
    this.world.componentsById.delete(this.id);
    this.world.registry.pool.get(this.type).release(this);
  }

}
