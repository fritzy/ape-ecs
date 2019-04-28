const EntityArray = require('./entityarray');

let componentId = 0;

class BaseComponent {

  constructor(ecs, entity, initialValues) {

    delete initialValues.type;
    delete initialValues.entity;
    Object.defineProperty(this, 'ecs', { enumerable: false, value: ecs });
    Object.defineProperty(this, 'entity', { enumerable: true, value: entity });
    Object.defineProperty(this, 'type', { enumerable: false, value: this.constructor.name });
    Object.defineProperty(this, '_values', { enumerable: false, value: {} });
    Object.defineProperty(this, 'id', { enumerable: false, value: componentId });
    Object.defineProperty(this, 'lastTick', { enumerable: false, writable: true, value: this.ecs.ticks });
    componentId++;

    //loop through inheritance by way of prototypes
    //avoiding constructor->super() boilerplate for every component
    //also avoiding proxies just for a simple setter on properties
    const definitions = [];
    for (var c = this.constructor; c !== null && c.name; c = Object.getPrototypeOf(c)) {
      if (!c.definition) continue;
      definitions.push(c.definition);
    }
    //we want to inherit deep prototype defintions first
    definitions.reverse();

    for (let idx = 0, l = definitions.length; idx < l; idx++) {

      const definition = definitions[idx];
      // set component properties from Component.properties
      if (!definition.properties) {
        continue;
      }
      const properties = definition.properties;
      const keys = Object.keys(properties);
      for (let idx = 0, l = keys.length; idx < l; idx++) {
        const property = keys[idx];
        if (property === 'id' || property === 'type') {
          throw new Error(`Cannot override property in Component definition: ${property}`);
        }
        const value = properties[property];
        if (this._values.hasOwnProperty(property)) {
          this[property] = value;
          continue;
        }
        if (this.hasOwnProperty(property)) {
          continue;
        }
        switch (value) {
          case '<EntityArray>':
            Object.defineProperty(this, property, {
              writable: false,
              enumerable: true,
              value: EntityArray([], this)
            });
            break;
          case '<EntityObject>':
            Object.defineProperty({}, property, {
              writable: false,
              enumerable: true,
              value: EntityArray([], this)
            });
            break;
          case '<Entity>':
            Object.defineProperty(this, property, {
              enumerable: true,
              writeable: true,
              set: (value) => {

                this.lastTick = this.ecs.ticks;
                return Reflect.set(this._values, property, value);
              },
              get: () => {

                return this.ecs.getEntity(this._values[property]);
              }
            });
            this._values[property] = null;
            break;
          default:
            Object.defineProperty(this, property, {
              enumerable: true,
              writeable: true,
              set: (value) => {
                this.lastTick = this.ecs.ticks;
                return Reflect.set(this._values, property, value);
              },
              get: () => {
                return Reflect.get(this._values, property);
              }
            });
            this._values[property] = value;
            break;
        }
      }
    }

    // don't allow new properties
    Object.seal(this);
    Object.seal(this._values);
    Object.assign(this, initialValues);
  }

  stringify() {

    return JSON.stringify(this.getObject());
  }

  clone() {

    const obj = Object.assign({}, this._values);
    obj.entity = null;
    return this.ecs.newComponent(this.constructor.name, obj)
  }

  [Symbol.iterator]() {

    return Object.keys(this._values);
  }

  getObject() {


    return Object.assign({ id: this.id, type: this.type }, this._values);
  }

}

BaseComponent.definition = {
  properties: {
  },
  multiset: false
};

module.exports = BaseComponent;
