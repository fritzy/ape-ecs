const Util = require('./util');
const idGen = new Util.IdGenerator();

class Component {
  constructor(world) {
    this.world = world;
    this._meta = {
      key: '',
      updated: 0,
      entityId: '',
      refs: new Set(),
      ready: false,
      values: {}
    };
  }

  preInit(initial) {
    return initial;
  }

  init(initial) {}

  get type() {
    return this.constructor.name;
  }

  get key() {
    return this._meta.key;
  }

  set key(value) {
    const old = this._meta.key;
    this._meta.key = value;
    if (old) {
      delete this.entity.c[old];
    }
    if (value) {
      this.entity.c[value] = this;
    }
  }

  destroy() {
    this.preDestroy();
    this._meta.values = {};
    for (const ref of this._meta.refs) {
      const [value, prop, sub] = ref.split('||');
      this.world._deleteRef(
        value,
        this._meta.entityId,
        this.id,
        prop,
        sub,
        this._meta.key,
        this.type
      );
    }
    this.world._sendChange({
      op: 'destroy',
      component: this.id,
      entity: this._meta.entityId,
      type: this.type
    });
    this.world.componentsById.delete(this.id);
    this.world.componentPool.get(this.type).release(this);
    this.postDestroy();
  }

  preDestroy() {}

  postDestroy() {}

  getObject(withIds = true) {
    const obj = {
      type: this.constructor.name
    };
    if (withIds) {
      obj.id = this.id;
      obj.entity = this.entity.id;
    }
    let fields = this.constructor.serializeFields || this.constructor.fields;
    if (Array.isArray(this.constructor.skipSerializeFields)) {
      fields = fields.filter((field, idx, arr) => {
        return this.constructor.skipSerializeFields.indexOf(field) === -1;
      });
    }
    for (const field of fields) {
      if (
        this[field] !== undefined &&
        this[field] !== null &&
        typeof this[field].getValue === 'function'
      ) {
        obj[field] = this[field].getValue();
      } else if (this._meta.values.hasOwnProperty(field)) {
        obj[field] = this._meta.values[field];
      } else {
        obj[field] = this[field];
      }
    }
    if (this._meta.key) {
      obj.key = this._meta.key;
    }
    return obj;
  }

  _setup(entity, initial) {
    this.entity = entity;
    this.id = initial.id || idGen.genId();
    this._meta.updated = this.world.currentTick;
    this._meta.entityId = entity.id;
    if (initial.key) {
      this.key = initial.key;
    }
    this._meta.values = {};
    this.world.componentsById.set(this.id, this);

    const fields = this.constructor.fields;
    const primitives = this.constructor.primitives;
    const factories = this.constructor.factories;
    // shallow copy of the property defaults
    initial = this.preInit(initial);
    const values = Object.assign({}, primitives, initial);
    for (const field of fields) {
      const value = values[field];
      if (factories.hasOwnProperty(field)) {
        const res = factories[field](this, value, field);
        if (res !== undefined) {
          this[field] = res;
        }
      } else {
        this[field] = value;
      }
    }
    this._meta.ready = true;
    Object.freeze();
    this.init(initial);
    this.world._sendChange({
      op: 'add',
      component: this.id,
      entity: this._meta.entityId,
      type: this.type
    });
  }

  _reset() {
    this._meta.key = '';
    this._meta.updated = 0;
    this._meta.entityId = 0;
    this._meta.ready = false;
    this._meta.refs.clear();
    this._meta.values = {};
  }

  update(values) {
    if (values) {
      delete values.type;
      Object.assign(this, values);
      if (this.constructor.changeEvents) {
        const change = {
          op: 'change',
          props: [],
          component: this.id,
          entity: this._meta.entityId,
          type: this.type
        };
        for (const prop in values) {
          change.props.push(prop);
        }
        this.world._sendChange(change);
      }
    }
    this._meta.updated = this.entity.updatedValues = this.world.currentTick;
  }

  _addRef(value, prop, sub) {
    this._meta.refs.add(`${value}||${prop}||${sub}`);
    this.world._addRef(
      value,
      this._meta.entityId,
      this.id,
      prop,
      sub,
      this._meta.key,
      this.type
    );
  }

  _deleteRef(value, prop, sub) {
    this._meta.refs.delete(`${value}||${prop}||${sub}`);
    this.world._deleteRef(
      value,
      this._meta.entityId,
      this.id,
      prop,
      sub,
      this._meta.key,
      this.type
    );
  }
}

Component.properties = {};
Component.serialize = true;
Component.serializeFields = null;
Component.skipSerializeFields = null;
Component.subbed = false;
Component.registered = false;

module.exports = Component;
