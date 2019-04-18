const EntityArray = require('./entityarray');

let componentId = 0;

class BaseComponent {

  constructor(ecs, initialValues) {

    Object.defineProperty(this, 'ecs', { enumerable: false, value: ecs });
    Object.defineProperty(this, 'type', { enumerable: false, value: this.constructor.name });
    Object.defineProperty(this, '_values', { enumerable: false, value: {} });
    Object.defineProperty(this, 'id', { enumerable: true, value: componentId });
    this.lastTick = this.ecs.ticks;
    componentId++;

    //loop through inheritance by way of prototypes
    //avoiding constructor->super() boilerplate for every component
    //also avoiding proxies just for a simple setter on properties
    for (var c = this.constructor; c !== null && c.name; c = Object.getPrototypeOf(c)) {

      // set component properties from Component.properties
      if (!c.definition) continue;
      if (c.definition.properties) {
        const properties = c.definition.properties;
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
        }
      }

      // set component properties that are references to entities
      if (Array.isArray(c.definition.entityRefs)) {
        const entityRefs = c.definition.entityRefs;
        for (let idx = 0, l = entityRefs.length; idx < l; idx++) {
          const property = entityRefs[idx];
          if (this.hasOwnProperty(property)) {
            continue;
          }
          Object.defineProperty(this, property, {
            enumerable: true,
            writeable: true,
            set: (value) => {
              this.lastTick = this.ecs.ticks;
              return Reflect.set(this._values, property, value);
            },
            get: () => {
              this.getEntityRef(property);
            }
          });
          this._values[property] = null;
        }
      }

      if (c.definition.entities) {
        // entities array
        this.entities = EntityArray([], this);
      }
    }

    // don't allow new properties
    Object.seal(this);
    Object.seal(this._values);
    Object.assign(this._values, initialValues);
  }

  stringify() {

    return JSON.stringify(this.getObject());
  }

  getEntityRef(property) {

    return this.ecs.getEntity(this._values[property]);
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
};

module.exports = BaseComponent;
