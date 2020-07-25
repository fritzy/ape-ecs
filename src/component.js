const ComponentRefs = require('./componentrefs');
const IdGenerator = require('./util').IdGenerator;

const idGen = new IdGenerator();
let ids = 0;

class Component {

  constructor(entity, initial) {

    this._meta = {
      lookup: '',
      updated: 0,
      entityId: '',
      refs: new Set(),
      ready: false,
      values: {}
    };
    this._setup(entity, initial)
  }

  get entity() {

    return this.world.getEntity(this._meta.entityId);
  }

  _setup(entity, initial) {

    if (initial.id) {
      this.id = initial.id;
    } else {
      this.id = idGen.genId();
    }
    this._meta.updated = this.world.currentTick;
    this._meta.entityId = entity.id;
    if (initial.lookup) {
      this.lookup = initial.lookup;
    }
    this._meta.values = {};
    this.world.componentsById.set(this.id, this);

    const props = this.constructor.props;
    const values = Object.assign({}, props.primitive, initial);
    for (const field of props.fields) {
      const value = values[field];
      if (props.special.hasOwnProperty(field)) {
        const res = props.special[field](this, value, field);
        if (res !== undefined) {
          this[field] = res;
        }
      } else {
        this[field] = value;
      }
    }
    this.onInit();
    this._meta.ready = true;
    this.world._sendChange({
      op: 'add',
      component: this.id,
      entity: this._meta.entityId,
      type: this.type
    });
  }

  _reset() {

    this._meta.lookup = '';
    this._meta.updated = 0;
    this._meta.entityId = 0;
    this._meta.ready = false;
    this._meta.refs.clear();
    this._meta.values = {};
  }

  getObject(componentIds=true) {

    const props = this.constructor.props;
    const obj = Object.assign({
      entity: this._meta.entityId,
      type: this.type
    }, this._meta.values);
    for (const field of this.constructor.props.fields) {
      if (!obj.hasOwnProperty(field)) {
        obj[field] = this[field].getValue();
      }
    }
    if (componentIds) {
      obj.id = this.id;
    }
    obj.lookup = this.lookup;
    return obj;
  }


  _addRef(value, prop, sub) {

    this._meta.refs.add(`${value}||${prop}||${sub}`);
    this.world._addRef(value, this._meta.entityId, this.id, prop, sub, this._meta.lookup, this.type);
  }

  _deleteRef(value, prop, sub) {

    this._meta.refs.delete(`${value}||${prop}||${sub}`);
    this.world._deleteRef(value, this._meta.entityId, this.id, prop, sub, this._meta.lookup, this.type);
  }

  destroy() {

    this.onDestroy();
    for (const ref of this._meta.refs) {
      const [value, prop, sub] = ref.split('||');
      this.world._deleteRef(value, this._meta.entityId, this.id, prop, sub, this._meta.lookup, this.type);
    }
    this.world._sendChange({
      op: 'destroy',
      component: this.id,
      entity: this._meta.entityId,
      type: this.type
    });
    this.world.componentsById.delete(this.id);
    this.world.componentPool.get(this.type).release(this);
  }
}

module.exports = Component;
