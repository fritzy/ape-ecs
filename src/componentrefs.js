module.exports = {

  EntityObject: (object, component, reference) => {

    const entity = component.entity;
    const ecs = component.ecs;

    return new Proxy(object, {
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

    class ComonentSet extends Set {

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

    return new ComonentSet(object);
  },

  ComponentObject: (object, component) => {

    return new Proxy(object, {
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
      }
    });
  }

}
