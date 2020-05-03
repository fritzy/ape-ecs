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

  EntityRef: (obj, comp, path) => {

    const handler = {
      get() {

        return comp.ecs.getEntity(comp._values[path]);
      },

      set(value) {

        const old = comp._values[path];
        value = (value && typeof value !== 'string') ? value.id : value;
        if (old && old !== value) {
          comp._deleteRef(old, comp.entity.id, comp.id, path, undefined, comp.type);
        }
        if (value && value !== old) {
          comp._addRef(value, comp.entity.id, comp.id, path, undefined, comp.type);
        }
        comp._values[path] = value;
        comp._updated('setEntity', path, old, value);
        return true;
      },
      enumerable: true
    };

    const nodes = path.split('.');
    let target = comp;
    for (let i = 0; i < nodes.length - 1; i++) {
      target = target[nodes[i]];
    }

    Object.defineProperty(target, nodes[nodes.length - 1], handler);
    comp._values[path] = null;
    return;
  },
  ComponentRef: (obj, comp, path) => {
    const handler = {
      get() {

        return comp.entity.componentMap[comp._values[path]];
      },
      set(value) {

        if (typeof value === 'object' && value !== null) {
          value = value.id;
        }
        const old = comp._values[path];
        comp._values[path] = value;
        comp._updated('setComponent', path, old, value);
        return true;
      },
      enumerable: true
    };
    const nodes = path.split('.');
    let target = comp;
    for (let i = 0; i < nodes.length - 1; i++) {
      target = target[nodes[i]];
    }

    Object.defineProperty(target, nodes[nodes.length - 1], handler);
    comp._values[path] = null;
    return;
  },

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

  EntitySet: (object, component, reference) => {
    const ecs = component.ecs;
    const entity = component.entity;
    const entityId = entity.id;

    class EntitySet extends Set {

      /* $lab:coverage:off$ */
      // lab doesn't detect this being used internally
      static get [Symbol.species]() { return this.constructor; }
      /* $lab:coverage:on */

      add(value) {

        if (value.id) {
          value = value.id;
        }
        ecs.addRef(value, entityId, component.id, reference, '__set__');
        component.updated = component.ecs.ticks;
        component._updated('addEntitySet', reference, undefined, value);
        return super.add(value);
      }

      delete(value) {

        if (value.id) {
          value = value.id;
        }
        ecs.deleteRef(value, entityId,component.id, reference, '__set__');
        component.updated = component.ecs.ticks;
        component._updated('deleteEntitySet', reference, undefined, value);
        return super.delete(value);
      }

      clear() {

        component._updated('clearEntitySet', reference, undefined, undefined);
        for (const entity of this) {
          this.delete(entity);
        }
      }

      has(value) {

        if (value.id) {
          value = value.id;
        }
        const has = super.has(value);
        return has;
      }

      [Symbol.iterator]() {

        const that = this;
        const siterator = super[Symbol.iterator]();
        return {
          next() {

            const result = siterator.next();
            if (typeof result.value === 'string') {
              result.value = component.ecs.getEntity(result.value);
            }
            return result;
          }
        }
      }

      toJSON() {

        return [...this].map(entity => entity.id);
      }
    }

    return new EntitySet(object);
  },

  ComponentSet: (object, component, reference) => {
    const ecs = component.ecs;
    const entity = component.entity;

    class ComponentSet extends Set {

      /* $lab:coverage:off$ */
      // lab doesn't detect this being used internally
      static get [Symbol.species]() { return this.constructor; }
      /* $lab:coverage:on */

      add(value) {

        if (value.id) {
          value = value.id;
        }
        component._updated('addComponentSet', reference, undefined, value);
        return super.add(value);
      }

      delete(value) {

        if (value.id) {
          value = value.id;
        }
        component._updated('deleteComponentSet', reference, undefined, value);
        return super.delete(value);
      }

      clear() {

        component._updated('clearComponentSet', reference, undefined, undefined);
        for (const entity of this) {
          this.delete(entity);
        }
      }

      has(value) {

        if (value.id) {
          value = value.id;
        }
        const has = super.has(value);
        return has;
      }

      [Symbol.iterator]() {

        const that = this;
        const siterator = super[Symbol.iterator]();
        return {
          next() {

            const result = siterator.next();
            if (typeof result.value === 'string') {
              result.value = entity.componentMap[result.value];
            }
            return result;
          }
        }
      }

      /* $lab:coverage:off$ */
      // code coverage tool is wrong about this for some reason
      // ¯\_(ツ)_/¯
      toJSON() {

        return [...this].map(entity => entity.id);
      }
      /* $lab:coverage:on$ */
    }

    return new ComponentSet(object);
  },

  ComponentObject: (object, component) => {

    return new Proxy({}, {
      get: (obj, prop, prox) => {

        const value = Reflect.get(obj, prop, prox);
        if (typeof value === 'string') {
          return component.entity.componentMap[value];
        }
        return value;
      },
      set: (obj, prop, value) => {

        component.lastTick = component.ecs.ticks;
        const old = Reflect.get(obj, prop);
        if (typeof value === 'object') {
          const result = Reflect.set(obj, prop, value.id);
          component._updated('setComponentObject', prop, old, value.id);
          return result;
        }
        const result = Reflect.set(obj, prop, value);
        component._updated('setComponentObject', prop, old, value);
        return result;
      },
      deleteProperty(obj, prop) {
        if (prop in obj) {
          delete obj[prop];
          component._updated('deleteComponentObject', prop);
          return true;
        }
      }
    });
  }
};
