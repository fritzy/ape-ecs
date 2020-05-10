module.exports = {

  Pointer: (path) => {
    path = path.split('.');
    const parent = path.slice(0, path.length - 1);

    const PointerFunc = (obj, comp, prop) => {

      const handler = {
        get() {

          let target = comp;
          for (const field of path.slice(0, path.length - 1)) {
            target = target[field];
          }
          const result = target[path[path.length - 1]];
          return result;
        },
        set(value) {

          let target = comp;
          for (const field of parent) {
            target = target[field];
          }
          const old = target[prop];
          target[prop] = value;
          comp._updated('setPointer', prop, old, value);
          return true;
        },
        enumerable: true
      };

      const nodes = prop.split('.');
      let target = comp;
      for (let i = 0; i < nodes.length - 1; i++) {
        target = target[nodes[i]];
      }

      Object.defineProperty(target, nodes[nodes.length - 1], handler);
      return;
    };
    return PointerFunc;
  },

  EntityRef: class EntityRef  {

    constructor(comp, obj, pathArr) {

      obj = obj || null;
      this.comp = comp;
      this.path = pathArr.join('.');
      this.world = this.comp.world;
      this.value = null;
      if (obj !== null) {
        this.set(obj);
      }
    }

    get() {

      return this.world.getEntity(this.value);
    }

    getValue() {

      return this.value;
    }

    reset() {

      if (this.value) {
        this.comp._deleteRef(value, this.path, undefined);
      }
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

      this.entity = component._meta.entity;
      this.world = component.world;
      this.entityId = this.entity.id;
      this.reference = reference.join('.');
      this.value = object || {};
      this.component = component;
    }

    get(prop) {

      return this.world.getEntity(this.value[prop]);
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
      this.entity = component._meta.entity;
      this.world = this.entity.world;
      this.entityId = this.entity.id;
      object = object.map(value => (typeof value === 'string') ? value : value.id );
      for (const item of object) {
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
            result.value = that.world.getEntity(result.value);
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
