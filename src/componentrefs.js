module.exports = {

  Setter: Symbol('Setter'),
  Pointer: (path) => {
    if (!Array.isArray(path)) {
      path = path.split('.');
    }
    const PointerFunc = (obj, comp, prop) => {
      class Pointer {

        constructor(comp, prop) {

          this.comp = comp;
          this.prop = prop;
          this.target = comp;
          this.field = path[path.length - 1];
        }

        set value(value) {

          let target = this.target;
          for (const field of path.slice(0, path.length - 1)) {
            target = target[field];
          }
          const old = target[prop];
          target[prop] = value;
          this.comp.updated = this.comp.ecs.ticks;
          if (comp.constructor.subbed)
            comp.ecs._sendChange(comp, 'setPointer', prop, old, value);
          return true;
        }

        get value() {

          let target = comp;
          for (const field of path.slice(0, path.length - 1)) {
            target = target[field];
          }
          const result = target[prop];
          return result;
        }

        _getRaw() {
          return this.value;
        }
      }
      return new Pointer(comp, prop);
    }
    PointerFunc.setter = module.exports.Setter;
    return PointerFunc;
  },

  EntityRef: (obj, comp, path) => {
    class EntityRef {

      constructor(comp, path) {

        this.comp = comp;
        this.path = path;
        this._value = null;
      }

      set value(value) {

        const old = Reflect.get(this, '_value');
        value = (value && typeof value !== 'string') ? value.id : value;
        if (old && old !== value) {
          comp._deleteRef(old, comp.entity.id, comp.id, path, undefined, comp.type);
        }
        if (value && value !== old) {
          comp._addRef(value, comp.entity.id, comp.id, path, undefined, comp.type);
        }
        this._value = value;
        this.comp.updated = this.comp.ecs.ticks;
        if (comp.constructor.subbed)
          comp.ecs._sendChange(comp, 'setEntity', path, old, value);
        return true;
      }

      get value() {

        return this.comp.ecs.getEntity(this._value);
      }

      _getRaw() {
        return this._value;
      }
    }
    return new EntityRef(comp, path);
  },
  ComponentRef: (obj, comp, path) => {
    class ComponentRef {

      constructor(comp, path) {

        this.comp = comp;
        this.path = path;
        this._value = null;
      }
      set value(value) {

        if (typeof value === 'object' && value !== null) {
          value = value.id;
        }
        const old = this._value;
        this._value = value;
        if (comp.constructor.subbed)
          comp.ecs._sendChange(this, 'setComponent', path, old, value);
        return true;
      }

      get value() {

        const result = comp.entity.componentMap[this._value];
        return result;
      }

      _getRaw() {
        return this._value;
      }
    }
    return new ComponentRef(comp, path);
  },

  EntityObject: (object, component, reference) => {

    const entity = component.entity;
    const ecs = component.ecs;

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
        ecs._sendChange(component, 'setEntityObject', prop, old, value);
        if (old && old !== value) {
          ecs.deleteRef(old, entity.id, component.id, reference, prop);
        }
        if (value && value !== old) {
          ecs.addRef(value, entity.id, component.id, reference, prop);
        }
        return result;
      },

      deleteProperty(obj, prop) {

        const old = Reflect.get(obj, prop);
        if (old) {
          ecs.deleteRef(old, entity.id, component.id, reference, prop);
        }
        if (prop in obj) {
          delete obj[prop];
          ecs._sendChange(component, 'deleteEntityObject', prop);
          return true;
        }
      }

    });
  },

  EntitySet: (object, component, reference) => {
    const ecs = component.ecs;
    const entity = component.entity;

    class EntitySet extends Set {

      /* $lab:coverage:off$ */
      // lab doesn't detect this being used internally
      static get [Symbol.species]() { return this.constructor; }
      /* $lab:coverage:on */

      add(value) {

        if (value.id) {
          value = value.id;
        }
        ecs.addRef(value, entity.id, component.id, reference, '__set__');
        component.updated = component.ecs.ticks;
        component.ecs._sendChange(component, 'addEntitySet', reference, undefined, value);
        return super.add(value);
      }

      delete(value) {

        if (value.id) {
          value = value.id;
        }
        ecs.deleteRef(value, entity.id,component.id, reference, '__set__');
        component.updated = component.ecs.ticks;
        component.ecs._sendChange(component, 'deleteEntitySet', reference, undefined, value);
        return super.delete(value);
      }

      clear() {

        component.updated = component.ecs.ticks;
        component.ecs._sendChange(component, 'clearEntitySet', reference, undefined, undefined);
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
        component.updated = component.ecs.ticks;
        component.ecs._sendChange(component, 'addComponentSet', reference, undefined, value);
        return super.add(value);
      }

      delete(value) {

        if (value.id) {
          value = value.id;
        }
        component.updated = component.ecs.ticks;
        component.ecs._sendChange(component, 'deleteComponentSet', reference, undefined, value);
        return super.delete(value);
      }

      clear() {

        component.updated = component.ecs.ticks;
        component.ecs._sendChange(component, 'clearComponentSet', reference, undefined, undefined);
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
          component.ecs._sendChange(component, 'setComponentObject', prop, old, value.id);
          return result;
        }
        const result = Reflect.set(obj, prop, value);
        component.ecs._sendChange(component, 'setComponentObject', prop, old, value);
        return result;
      },
      deleteProperty(obj, prop) {
        if (prop in obj) {
          delete obj[prop];
          component.ecs._sendChange(component, 'deleteComponentObject', prop);
          return true;
        }
      }
    });
  }
}

module.exports.EntityRef.setter = module.exports.Setter;
module.exports.ComponentRef.setter = module.exports.Setter;
//module.exports.Pointer.setter = module.exports.Setter;
