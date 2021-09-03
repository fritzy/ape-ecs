const Util = require('./util');
const idGen = new Util.IdGenerator();

class Component {

  constructor() {
    this._reset();
  }

  _reset() {
    this.world = null;
    this.id = null;
    this.lastTick = 0;
    this.clear();
  }

  clear() {
    for (const prop of this.constructor.properties) {
      this[prop] = undefined;
    }
  }

  _setup(world, entity, initial) {
    this.world = world;
    this.entity = entity;
    const values = { ...initial };
    this.id = initial.id || idGen.genId();
    this.key = initial.key || this.id;
    this.update(values);
  }

  init(initial) {
  }

  update(values) {
    if (values !== undefined) {
      for (const prop of Object.keys(values)) {
        if (this.constructor.properties.has(prop)) {
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
    this.entity?.setKey?.(this, this._key, value);
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
    if (this.constructor.serializeFields !== null
      && obj[Symbol.iterator] !== undefined
    ) {
      for (const prop of this.constructor.serializeFields) {
        obj = this;
      }
    }
    return obj;
  }

  destroy() {
  }

}

Component.properties = null;
Component.serialize = true;
Component.serializeFields = null;

module.exports = Component;
