
const EntityArray = (array, component) => {

  return new Proxy(array, {
    get: (arr, prop, prox) => {

      const value = Reflect.get(arr, prop, prox);
      if ((typeof prop === 'string' || typeof prop === 'number') && !isNaN(prop)) {
        return component.ecs.getEntity(value);
      }
      return value;
    },
    set: (arr, prop, value) => {

      component.lastTick = component.ecs.ticks;
      if (typeof value === 'object') {
        return Reflect.set(arr, prop, value.id);
      }
      return Reflect.set(arr, prop, value);
    }
  });
};

module.exports = EntityArray;
