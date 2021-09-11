const Util = require('./util');
const idGen = new Util.IdGenerator();

class Component {

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
    for (const prop of Object.keys(this.constructor.properties)) {
      this[prop] = undefined;
    }
  }

  _setup(world, entity, initial) {
    this.world = world;
    this.entity = entity;
    const values = { ...this.constructor.properties, ...initial };
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
        if (this.constructor.properties.hasOwnProperty(prop)) {
          this[prop] = values[prop];
        }
      }
    }
    this.lastTick = this.world.tick;
  }

  get key() {
    return this._key;
  }

  set key(value) {
    this.entity.c[this.type]?.updateKey?.(this, this._key, value);
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
    if (this.constructor.serializeFields !== null) {
      for (const prop of this.constructor.serializeFields) {
        obj[prop] = this[prop];
      }
    } else {
      for (const prop of Object.keys(this.constructor.properties)) {
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

Component.properties = null;
Component.serialize = true;
Component.serializeFields = null;

module.exports = Component;
