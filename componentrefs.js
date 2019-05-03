module.exports = {

  EntityObject: (object, component) => {

    return new Proxy(object, {
      get: (obj, prop, prox) => {

        const value = Reflect.get(obj, prop, prox);
        if ((typeof prop === 'string' || typeof prop === 'number') && !isNaN(prop)) {
          return component.ecs.getEntity(value);
        }
        return value;
      },
      set: (obj, prop, value) => {

        component.lastTick = component.ecs.ticks;
        const old = Reflect.get(obj, prop);
        if (typeof value === 'object') {
          const result = Reflect.set(obj, prop, value.id);
          component.ecs._sendChange(component, 'setEntityObject', prop, old, value.id);
          return result;
        }
        const result = Reflect.set(obj, prop, value);
        component.ecs._sendChange(component, 'setEntityObject', prop, old, value);
        return result;
      }
    });
  },

  ComponentObject: (object, component) => {

    return new Proxy(object, {
      get: (obj, prop, prox) => {

        const value = Reflect.get(obj, prop, prox);
        if ((typeof prop === 'string' || typeof prop === 'number') && !isNaN(prop)) {
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
