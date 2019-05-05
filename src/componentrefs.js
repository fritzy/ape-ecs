module.exports = {

  EntityObject: (object, component, reference) => {

    const isArray = Array.isArray(object);
    return new Proxy(object, {
      get: (obj, prop, prox) => {

        const value = Reflect.get(obj, prop, prox);
        if ((isArray && typeof prop !== 'symbol' && !isNaN(prop)) || !isArray) {
          return component.ecs.getEntity(value);
        }
        return value;
      },
      set: (obj, prop, value) => {

        component.lastTick = component.ecs.ticks;
        const old = Reflect.get(obj, prop);
        if (typeof value === 'object' && value !== null) {
          value = value.id;
        }
        const result = Reflect.set(obj, prop, value);
        component.ecs._sendChange(component, 'setEntityObject', prop, old, value);
        if (old && old !== value) {
          component.ecs.getEntity(old).remRef(component.entity.id, component.id, reference, prop);
        }
        if (value && value !== old) {
          component.ecs.getEntity(value).addRef(component.entity.id, component.id, reference, prop);
        }
        return result;
      }
    });
  },

  ComponentObject: (object, component) => {

    const isArray = Array.isArray(object);
    return new Proxy(object, {
      get: (obj, prop, prox) => {

        const value = Reflect.get(obj, prop, prox);
        if ((isArray && typeof prop !== 'symbol' && !isNaN(prop)) || !isArray) {
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
