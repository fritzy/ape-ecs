const UUID = require('uuid/v1');
const ComponentRefs = require('./componentrefs');
const genId = require('./util').genId;

function recursiveInit(comp, props, target, initial) {

  if (initial) {
    for (const key of Object.keys(props.default)) {
      if (initial[key] == undefined) {
        target[key] = props.default[key];
      } else {
        target[key] = initial[key];
      }
    }
  } else {
    Object.assign(target, props.default);
    initial = {};
  }
  for (const key of Object.keys(props.custom)) {
    const def = props.custom[key];
    const value = initial[key] || def.default;
    target[key] = new def.constructor(comp, value, [...props.path, key]);
  }
  for (const key of Object.keys(props.sub)) {
    target[key] = {};
    recursiveInit(comp, props.sub[key], target[key], initial[key]);
  }
  Object.seal(target);
}

function recursiveReset(props, target) {

  Object.assign(target, props.default);
  for (const key of Object.keys(props.custom)) {
    target[key]._reset();
  }
  for (const key of Object.keys(props.sub)) {
    recursiveReset(props.sub[key], target[key]);
  }
}

function recursiveAssign(values, props, target) {

  const custom = props.custom;
  for (const key of Object.keys(values)) {
    if (props.default.hasOwnProperty(key)) {
      target[key] = values[key];
    } else if (props.custom.hasOwnProperty(key)) {
      console.log(target[key]);
      target[key]._set(values[key]);
    } else if (props.sub.hasOwnProperty(key)) {
      recursiveAssign(values[key], props.sub[key], target[key]);
    }
  }
}

function recursiveGetObject(obj = {}, target, props) {

  for (const key of Object.keys(props.default)) {
    obj[key] = target[key];
  }
  for (const key of Object.keys(props.custom)) {
    obj[key] = target[key].getValue();
  }
  for (const key of Object.keys(props.sub)) {
    obj[key] = recursiveGetObject(obj[key], target[key], props.sub[key]);
  }
  return obj;
}

class Component {

  constructor(entity, initial={}, lookup) {

    this.id = initial.id || genId();
    if (lookup === '*') lookup = this.id;
    this._meta = {
      lookup,
      updated: this.world.ticks,
      entity: entity,
      refs: new Set()
    };
    Object.seal(this._meta);
    this.world.componentsById.set(this.id, this);
    this._init(initial);
    this.onInit();
    this.world._sendChange({
      op: 'add',
      component: this.id,
      entity: this._meta.entity.id,
      type: this.type
    });
  }

  _init(initial) {

    recursiveInit(this, this.constructor.props, this, initial);
  }

  setup(entity, initial, lookup) {

    this.id = initial.id || genId();
    if (lookup === '*') lookup = this.id;
    this._meta.lookup = lookup;
    this._meta.entity = entity;
    this.world.componentsById.set(this.id, this);
    this.assign(initial);
    this.onInit();
    this.world._sendChange({
      op: 'add',
      component: this.id,
      entity: this._meta.entity.id,
      type: this.type
    });
  }

  mutate(obj) {

    recursiveMutagte(this, obj);
  }

  reset() {

    recursiveReset(this.constructor.props, this);
  }

  getObject(componentIds=true) {

    const props = this.constructor.props;
    const obj = recursiveGetObject({}, this, props);
    if (componentIds) {
      obj.id = this.id;
    }
    obj.type = this.type;
    return obj;
  }


  assign(values) {

    recursiveAssign(values, this.constructor.props, this);
  }

  clear() {
  }

  _addRef(value, prop, sub) {

    this._meta.refs.add(`${value}||${prop}||${sub}`);
    this.world._addRef(value, this._meta.entity.id, this.id, prop, sub, this._meta.lookup, this.type);
  }

  _deleteRef(value, prop, sub) {

    this._meta.refs.delete(`${value}||${prop}||${sub}`);
    this.world._deleteRef(value, this._meta.entity.id, this.id, prop, sub, this._meta.lookup, this.type);
  }

  destroy() {

    this.onDestroy();
    for (const ref of this._meta.refs) {
      const [value, prop, sub] = ref.split('||');
      this.world._deleteRef(value, this._meta.entity.id, this.id, prop, sub, this._meta.lookup, this.type);
    }
    this._meta.refs.clear();
    this.world._sendChange({
      op: 'destroy',
      component: this.id,
      entity: this._meta.entity.id,
      type: this.type
    });
    this.world.componentsById.delete(this.id);
    this.world.componentPool[this.type].release(this);
  }
}

module.exports = Component;
