const UUID = require('uuid/v1');
const ComponentRefs = require('./componentrefs');

function walk(target, path) {
  for (let idx = 0, l = path.length; idx < l; idx++) {
    target = target[path[idx]];
  }
  return target;
}

const PRIM = 0;
const FUNC = 1;
const SUB = 2;

const NO_EVENTS = new Set(['updated', '_ready']);

class ComponentHandler {

  constructor(ecs, comp, def, path) {

    this.ecs = ecs;
    this.def = def;
    this.path = path;
    this.comp = comp;
    this.fields = {
      updated: PRIM,
      _ready: PRIM
    };
    this.functions = {};
    if (!def) return;

    const target = walk(comp, path);
    const fields = Object.keys(def);
    for (let idx = 0, l = fields.length; idx < l; idx++) {
      const field = fields[idx];
      const proppath = [...path, field].join('.');
      const value = def[field];
      if (typeof value === 'function') {
        const result = value(undefined, comp, proppath)
        if (result === undefined) {
          this.fields[field] = PRIM;
          continue;
        }
        target[field] = result;
        this.functions[field] = value;
        this.fields[field] = FUNC;
      } else if (value !== null && typeof value === 'object') {
        target[field] = {};
        target[field] = new Proxy(target[field], new ComponentHandler(ecs, comp, def[field], [...path, field]));
        this.fields[field] = SUB;
      } else {
        target[field] = value;
        this.fields[field] = PRIM;
      }
    }
  }

  set(target, prop, value) {

    this.comp.updated = this.comp.entity.updatedValues = this.ecs.ticks;
    switch (this.fields[prop]) {
      case PRIM:
        if(this.comp.subbed && !NO_EVENTS.has(prop)) {
          const old = target[prop];
          const path = [...this.path, prop].join('.');
          this.comp.ecs._sendChange(this.comp, 'set', path, old, value);
        }
        return Reflect.set(target, prop, value);
        break;
      case SUB:
        Object.assign(target[prop], value);
        return true;
        break;
      case FUNC:
        target[prop] = this.functions[prop](value, this.comp, [...this.path, prop].join('.'))
        return true;
        break;
      default:
        throw new Error(`Cannot assign undefined field ${[
          this.comp.type,
            ...this.path,
            prop
          ].join('.')}`);
    }
  }
}

const components = {};

class BaseComponent {

  constructor(ecs, entity, initial) {

    //Object.defineProperty(this, 'ecs', { enumerable: false, value: ecs });
    Object.defineProperty(this, 'entity', { enumerable: false, value: entity, configurable: false});
    this.type = this.constructor.name;
    this.id = initial.id || UUID();
    Object.defineProperty(this, '_values', { enumerable: false, value: {}, configurable: false});
    Object.defineProperty(this, '_reverse', { enumerable: false, value: new Set(), configurable: false});
    Object.defineProperty(this, 'updated', { enumerable: false, writable: true, value: this.ecs.ticks, configurable: false});
    Object.defineProperty(this, '_ready', { enumerable: false, writable: true, value: false, configurable: false});

    const assign = {...initial};
    delete assign.id;
    delete assign.type;

    const def = this.constructor.definition;
    const prox = new Proxy(this, new ComponentHandler(ecs, this, def.properties, []));
    Object.seal(this);
    Object.assign(prox, assign);
    this._ready = true;
    if (def.init)
      def.init.apply(this);
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
    for (const pathString of Object.keys(this._values)) {
      const path = pathString.split('.');
      let target = out;
      for (let idx = 0; idx < path.length - 1; idx++) {
        target = target[path[idx]];
      }
      target[path[path.length - 1]] = this._values[pathString];
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

module.exports = BaseComponent;
