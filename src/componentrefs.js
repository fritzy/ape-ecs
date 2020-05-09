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

      this.comp = comp;
      this.default = obj;
      this.path = pathArr.join('.');
      this.world = this.comp.world;
      this.value = null;
    }

    get() {

      return this.world.getEntity(this.value);
    }

    getValue() {

      return this.value;
    }

    reset() {

      if (this.value) {
        //this.world.deleteRef(value, this.comp.entity.id, this.comp.id, this.path, undefined, this.comp.type);
        this.comp._deleteRef(value, this.path, undefined);
      }
    }

    set(value) {

      const old = this.value;
      value = (value && typeof value !== 'string') ? value.id : value;
      if (old && old !== value) {
        //this.world.deleteRef(old, this.comp._meta.entity.id, this.comp.id, this.path, undefined, this.comp.type);
        this.comp._deleteRef(old, this.path, undefined);
      }
      if (value && value !== old) {
        this.comp._addRef(value, this.path, undefined);
      }
      this.value = value;
    }
  },

  /*
  EntityObject: (object, component, reference) => {

    const entity = component.entity;
    const ecs = component.ecs;
    const entityId = entity.id;

    return new Proxy({}, {
      get(obj, prop, prox) {

        const value = Reflect.get(obj, prop, prox);
        if (typeof value === 'string') {
          return component.ecs.getEntity(value);
        }
        return value;
      },
      set(obj, prop, value) {

        component.updated = component.ecs.ticks;
        const old = Reflect.get(obj, prop);
        if (value && value.id) {
          value = value.id;
        }
        const result = Reflect.set(obj, prop, value);
        component._updated('setEntityObject', prop, old, value);
        if (old && old !== value) {
          ecs.deleteRef(old, entityId, component.id, reference, prop);
        }
        if (value && value !== old) {
          ecs.addRef(value, entityId, component.id, reference, prop);
        }
        return result;
      },

      deleteProperty(obj, prop) {

        const old = Reflect.get(obj, prop);
        if (old) {
          ecs.deleteRef(old, entityId, component.id, reference, prop);
        }
        if (prop in obj) {
          delete obj[prop];
          component._updated('deleteEntityObject', prop);
          return true;
        }
      }

    });
  },
  */

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
      //this.world.deleteRef(value, this.entityId, this.component.id, this.reference, '__set__', this.component._meta.lookup);
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
