module.exports = {

  EntityRef: class EntityRef  {

    constructor(comp, obj, pathArr) {

      obj = obj || null;
      this.default = obj;
      this.comp = comp;
      this.path = pathArr.join('.');
      this.world = this.comp.world;
      this.value = null;
      if (obj !== null) {
        this.set(obj);
      }
    }

    _set(value) {
      this.set(value);
    }

    get() {

      return this.world.getEntity(this.value);
    }

    getValue() {

      return this.value;
    }

    _reset() {

      this.set(this.default);
    }

    set(value) {

      const old = this.value;
      value = (value && typeof value !== 'string') ? value.id : value;
      if (old && old !== value) {
        this.comp._deleteRef(old, this.path, undefined);
      }
      if (value && value !== old) {
        this.comp._addRef(value, this.path, undefined);
      }
      this.value = value;
    }
  },

  EntityObject: class EntityObject {

    constructor(component, object, reference) {

      this.reference = reference.join('.');
      this.value = Object.assign({}, object || {});
      this.default = object;
      this.component = component;
    }

    _reset() {

      this.value = Object.assign({}, this.default || {});
    }

    get(prop) {

      return this.component._meta.entity.world.getEntity(this.value[prop]);
    }

    _set(object) {

      for (const key of Object.keys(object)) {
        this.set(key, object[key]);
      }
    }

    set(prop, value) {

      const old = this.value[prop];
      if (value && value.id) {
        value = value.id;
      }
      this.value[prop] = value;
      if (old && old !== value) {
        this.component._deleteRef(old, `${this.reference}.${prop}`, '__obj__');
      }
      if (value && value !== old) {
        this.component._addRef(value, `${this.reference}.${prop}`, '__obj__');
      }
      return true;
    }

    has(prop) {

      return this.value.hasOwnProperty(prop);
    }

    delete(prop) {

      const old = this.value[prop];
      if (old) {
        this.component._deleteRef(old, `${this.reference}.${prop}`, '__obj__');
      }
      delete this.value[prop];
    }

    keys() {

      return Object.keys(this.value);
    }

    getValue() {

      return this.value;
    }

  },

  EntitySet: class EntitySet extends Set {

    static get [Symbol.species]() { return this.constructor; }

    constructor (component, object = [], reference) {

      super();
      this.component = component;
      this.reference = reference.join('.');
      this.sub = reference.slice(0, reference.length - 1).join('.');
      object = object.map(value => (typeof value === 'string') ? value : value.id );
      this.default = object;
      for (const item of object) {
        this.add(item);
      }
    }

    _reset() {

      this.clear();
      for (const item of this.default) {
        this.add(item);
      }
    }

    _set(items) {
      for (const item of this.default) {
        if (item.id) item = item.id;
        this.add(item);
      }
    }

    add(value) {

      if (value.id) {
        value = value.id;
      }
      this.component._addRef(value, this.reference, '__set__');
      super.add(value);
    }

    delete(value) {

      if (value.id) {
        value = value.id;
      }
      this.component._deleteRef(value, this.reference, '__set__');
      const res = super.delete(value);
      return res;
    }

    has(value) {

      if (value.id) {
        value = value.id;
      }
      return super.has(value);
    }

    [Symbol.iterator]() {

      const that = this;
      const siterator = super[Symbol.iterator]();
      return {
        next() {

          const result = siterator.next();
          if (typeof result.value === 'string') {
            result.value = that.component._meta.entity.world.getEntity(result.value);
          }
          return result;
        }
      }
    }

    getValue() {

      return [...this].map(entity => entity.id);
    }
  }

};
