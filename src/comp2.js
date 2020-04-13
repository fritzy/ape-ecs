const UUID = require('uuid/v1');
const ComponentRefs = require('./componentrefs');

function walk(target, path) {
  for (const field of path) {
    target = target[path];
  }
  return target;
}

class ComponentHandler {

  constructor(ecs, comp, def, path) {

    this.ecs = ecs;
    this.def = def;
    this.path = path;
    this.comp = comp;
    this.functions = {};
    this.special = new Set();
    this.sub = new Set();
    this.primitive = new Set(['updated', '_ready']);
    this.setter = new Set();
    if (!def) return;
    for (const field of Object.keys(def)) {
      const proppath = [...path, field].join('.');
      const target = walk(comp, path);
      const value = def[field];
      if (value && value.setter === ComponentRefs.Setter) {
        target[field] = value({}, comp, proppath)
        this.functions[field] = value;
        this.setter.add(field);
      } else if (typeof value === 'function') {
        target[field] = value(undefined, comp, proppath)
        this.functions[field] = value;
        this.special.add(field);
      } else if (value !== null && typeof value === 'object') {
        target[field] = new Proxy(value, new ComponentHandler(ecs, comp, value, [...path, field])),
        this.sub.add(field);
      } else {
        target[field] = value;
        this.primitive.add(field);
      }
    }
  }

  get(target, prop, receiver) {

    let get;
    if (this.setter.has(prop)) {
      get = target[prop].value;
    } else {
      get = Reflect.get(target, prop, receiver);
    }
    return get;
  }

  set(target, prop, value) {

    this.comp.updated = this.ecs.ticks;
    if (this.setter.has(prop)) {
      target[prop].value = value;
      return true;
    } else if (this.sub.has(prop)) {
      for (const field of Object.keys(value)) {
        target[prop][field] = value[field];
      }
      return true;
    } else if (this.primitive.has(prop)) {
      const old = target[prop];
      const path = [...this.path, prop].join('.');
      this.comp.ecs._sendChange(this.comp, 'set', path, old, value);
      return Reflect.set(target, prop, value);
    } else if (this.special.has(prop)) {
      target[prop] = this.functions[prop](value, target, [...this.path, prop].join('.'))
      return true;
    } else {
      throw new Error(`Cannot assign undefined field ${[
        this.comp.type,
          ...this.path,
          prop
        ].join('.')}`);
    }
  }
}

const components = {};

class BaseComponent2 {

  constructor(ecs, entity, initial) {

    Object.defineProperty(this, 'ecs', { enumerable: false, value: ecs });
    Object.defineProperty(this, 'entity', { enumerable: false, value: entity });
    Object.defineProperty(this, 'type', { enumerable: true, value: this.constructor.name });
    Object.defineProperty(this, 'id', { enumerable: true, value: initial.id || UUID() });
    Object.defineProperty(this, '_reverse', { enumerable: false, value: new Set() });
    Object.defineProperty(this, 'updated', { enumerable: false, writable: true, value: this.ecs.ticks });
    Object.defineProperty(this, '_ready', { enumerable: false, writable: true, value: false });

    const assign = {...initial};
    delete assign.id;
    delete assign.type;

    const def = this.constructor.definition;
    Object.assign(this, def.properties);
    const prox = new Proxy(this, new ComponentHandler(ecs, this, def.properties, []));
    Object.seal(this);
    Object.assign(prox, assign);
    this._ready = true;
    if (this.constructor.definition.init)
      this.constructor.definition.init.apply(this);
    if (this.constructor.subbed) {
      this.ecs._sendChange(this, 'addComponent');
    }
    return prox;
  }

  getObject() {

    let fields = Object.keys(this);
    if (this.constructor.definition.serialize) {
      const serialize = this.constructor.definition.serialize;
      if (serialize.skip) return;
      if (Array.isArray(serialize.ignore)) {
        const ignore = new Set(serialize.ignore);
        fields = fields.filter((field) => !ignore.has(field));
      }
    }
    const out = {};
    for (const field of fields) {
      if (this[field] && this[field]._getRaw) {
        out[field] = this[field]._getRaw();
      } else {
        out[field] = this[field];
      }
    }
    return out;
  }

  stringify() {

    return JSON.stringify(this.getObject());
  }

  _addRef(target, entity, component, prop, sub, type) {

    this._reverse.add([...arguments].join('|'));
    this.ecs.addRef(target, entity, component, prop, sub, type)
  }

  _deleteRef(target, entity, component, prop, sub, type) {

    let idx = 0;
    const ref = [...arguments].join('|');
    this._reverse.delete(ref);
    this.ecs.deleteRef(target, entity, component, prop, sub, type)
  }

  destroy(remove=true) {

    for (const ref of this._reverse) {
      const args = ref.split('|');
      this.ecs.deleteRef(...args);
    }
    if (this.constructor.definition.destroy) {
      this.constructor.definition.destroy.apply(this);
    }
    if (remove) {
      this.entity.removeComponent(this, false, false);
    }
    this._ready = false;
  }
}

function registerComponent(name, definition) {

  const klass = class Component extends BaseComponent {}
  Object.defineProperty(klass, 'name', { value: name });
  klass.definition = definition;
  components[name] = klass;
}
module.exports = BaseComponent2;
