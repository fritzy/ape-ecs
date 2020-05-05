const UUID = require('uuid/v1');
const ComponentRefs = require('./componentrefs');

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
    Component._recursiveInit(props.sub[key], target[key], initial[key]);
  }
  Object.seal(target);
}

function recursiveReset(props, target) {

  Object.assign(target, props.default);
  for (const key of Object.keys(props.custom)) {
    target[key].reset();
  }
  for (const key of Object.keys(props.sub)) {
    Component._recursiveReset(props.sub[key], target[key]);
  }
}

function recursiveAssign(values, props, target) {

  const custom = props.custom;
  for (const key of Object.keys(values)) {
    if (props.default.hasOwnProperty(key)) {
      target[key] = values[key];
    } else if (props.custom.hasOwnProperty(key)) {
      target[key].set(values[key]);
    } else if (props.sub.hasOwnProperty(key)) {
      Component._recursiveAssign(values[key], props.sub[key], target[key]);
    }
  }
}

function recursiveGetObject(obj = obj, target, props) {

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

  constructor(entity, initial) {

    this._meta = {
      lookup: '',
      updated: this.constructor.world.ticks,
      entity: entity
    };
    Object.seal(this._meta);
    this._init(initial);
  }


  _init(initial) {

    this.id = this.id || UUID();
    recursiveInit(this, this.constructor.props, this, initial);
  }


  reset() {

    recursiveReset(this.constructor.props, this);
  }

  getObject() {

    const props = this.constructor.props;
    const obj = recursiveGetObject({}, this, props);
    obj.id = this.id;
    obj.type = this.type;
    return obj;
  }


  assign(values) {

    recursiveAssign(values, this.constructor.props, this);
  }

  clear() {
  }
}

module.exports = Component;
