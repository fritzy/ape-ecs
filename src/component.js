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
    this.const = comp.constructor;
    this.filterEvents = new Set(['updated', '_ready']);
    this.fields = {
      updated: PRIM,
      _ready: PRIM,
      _fields: PRIM
    };
    this.functions = {};
    if (!def) return;

    const target = walk(comp, path);
    const fields = Object.keys(def);
    for (let idx = 0, l = fields.length; idx < l; idx++) {
      const field = fields[idx];
      const proppath = [...path, field].join('.');
      comp._fields.push(proppath);
      const value = def[field];
      if (typeof value === 'function') {
        const result = value(undefined, comp, proppath)
        if (result === undefined) {
          this.fields[field] = PRIM;
          this.filterEvents.add(field);
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
        if(this.const.subbed && !this.filterEvents.has(prop)) {
          const old = target[prop];
          const path = [...this.path, prop].join('.');
          this.comp._updated('set', path, old, value);
        }
        return Reflect.set(target, prop, value);
      case SUB:
        Object.assign(target[prop], value);
        return true;
      case FUNC:
        target[prop] = this.functions[prop](value, this.comp, [...this.path, prop].join('.'))
        return true;
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

    this._fields = [];
    this.entity = entity;
    this.type = this.constructor.name;
    this.id = initial.id || UUID();
    this._values = {};
    this._reverse = new Set();
    this.updated = this.ecs.ticks;
    this._ready = false;

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
    this._updated('addComponent');
    return prox;
  }

  getObject() {

    let fields = [...this._fields];
    if (this.constructor.definition.serialize) {
      const serialize = this.constructor.definition.serialize;
      if (serialize.ignore) {
        const ignore = new Set(serialize.ignore);
        fields = fields.filter((field) => !ignore.has(field));
      }
    }
    const out = {
      id: this.id,
      type: this.type
    };
    for (const path of fields) {
      if (this._values.hasOwnProperty(path)) {
        continue;
      }
      let source = this;
      let target = out;
      for (const node of path.split('.')) {
        source = source[node];
        /* $lab:coverage:off$ */
        if (typeof source === 'object' && source !== null) {
        /* $lab:coverage:on$ */
          target[node] = {};
          if (source.toJSON) {
            source = source.toJSON();
            target[node] = source;
          } else {
            Object.assign(target[node], source);
          }
        } else {
          target[node] = source;
        }
        target = target[node]
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

  _updated(op, prop, old, value) {

    if(!this._ready) return;
    this.updated = this.entity.updatededValues = this.ecs.ticks;
    if (!this.constructor.subbed) return;
    this.ecs._sendChange(this, op, prop, old, value);
  }
}

module.exports = BaseComponent;
