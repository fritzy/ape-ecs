const ComponentRefs = require('./componentrefs');
const UUID = require('uuid/v1');
const CoreProperties = new Set([
  'ecs', 'entity', 'type', '_values', '_ready', 'id',
  'updated', 'constructor', 'stringify', 'clone', 'getObject'
]);

class BaseComponent {

  constructor(ecs, entity, initialValues) {

    Object.defineProperty(this, 'ecs', { enumerable: false, value: ecs });
    Object.defineProperty(this, 'entity', { enumerable: true, value: entity });
    Object.defineProperty(this, 'type', { enumerable: false, value: this.constructor.name });
    Object.defineProperty(this, '_values', { enumerable: false, value: {} });
    Object.defineProperty(this, '_refs', { enumerable: false, value: {} });
    Object.defineProperty(this, '_ready', { writable: true, enumerable: false, value: false });
    Object.defineProperty(this, 'id', { enumerable: true, value: initialValues.id || UUID() });
    Object.defineProperty(this, 'updated', { enumerable: false, writable: true, value: this.ecs.ticks });
    Object.defineProperty(this, '_init', { enumerable: false, writable: false, value: [] });
    Object.defineProperty(this, '_destroy', { enumerable: false, writable: false, value: [] });

    //loop through inheritance by way of prototypes
    //avoiding constructor->super() boilerplate for every component
    //also avoiding proxies just for a simple setter on properties
    const definitions = [];
    for (var c = this.constructor; c !== null; c = Object.getPrototypeOf(c)) {
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
      if (definition.init) {
        this._init.push(definition.init);
      }
      if (definition.destroy) {
        this._destroy.push(definition.destroy);
      }
      const properties = definition.properties;
      const keys = Object.keys(properties);
      for (let idx = 0, l = keys.length; idx < l; idx++) {
        const property = keys[idx];
        if (CoreProperties.has(property)) {
          throw new Error(`Cannot override property in Component definition: ${property}`);
        }
        const value = properties[property];
        if (this._values.hasOwnProperty(property)) {
          this[property] = value;
          continue;
        }
        switch (value) {
          case '<EntitySet>':
            Object.defineProperty(this, property, {
              //writable: true,
              enumerable: true,
              set: (value) => {
                Reflect.set(this._values, property, ComponentRefs.EntitySet(value, this, property));
              },
              get: () => {
                return Reflect.get(this._values, property);
              }
            });
            //this._refs[property] = this[property];
            this[property] = [];
            break;
          case '<EntityObject>':
            Object.defineProperty(this, property, {
              writable: false,
              enumerable: true,
              value: ComponentRefs.EntityObject({}, this, property)
            });
            this._refs[property] = this[property];
            break;
          case '<Entity>':
            Object.defineProperty(this, property, {
              enumerable: true,
              writeable: true,
              set: (value) => {

                if (value && value.id) {
                  value = value.id;
                }
                const old = Reflect.get(this._values, property);
                if (old && old !== value) {
                  this.ecs.deleteRef(old, this.entity.id, this.id, property);
                }
                if (value && value !== old) {
                  this.ecs.addRef(value, this.entity.id, this.id, property);
                }
                const result = Reflect.set(this._values, property, value);
                this.ecs._sendChange(this, 'setEntity', property, old, value);
                return result;
              },
              get: () => {

                return this.ecs.getEntity(this._values[property]);
              }
            });
            this._values[property] = null;
            break;
          case '<ComponentObject>':
            Object.defineProperty(this, property, {
              writable: false,
              enumerable: true,
              value: ComponentRefs.ComponentObject({}, this)
            });
            this._refs[property] = this[property];
            break;
          case '<ComponentSet>':
            Object.defineProperty(this, property, {
              //writable: true,
              enumerable: true,
              set: (value) => {
                Reflect.set(this._values, property, ComponentRefs.ComponentSet(value, this, property));
              },
              get: () => {
                return Reflect.get(this._values, property);
              }
            });
            //this._refs[property] = this[property];
            this[property] = [];
            break;
          case '<Component>':
            Object.defineProperty(this, property, {
              enumerable: true,
              writeable: true,
              set: (value) => {

                if (typeof value === 'object') {
                  value = value.id;
                }
                const old = Reflect.get(this._values, property);
                const result = Reflect.set(this._values, property, value);
                this.ecs._sendChange(this, 'setComponent', property, old, value);
                return result;
              },
              get: () => {

                return this.entity.componentMap[this._values[property]];
              }
            });
            this._values[property] = null;
            break;
          default:
            let reflect = null;
            if (typeof value === 'string' && value.startsWith('<Pointer ')) {
              reflect = value.substring(9, value.length - 1).trim().split('.')
            }
            Object.defineProperty(this, property, {
              enumerable: true,
              writeable: true,
              set: (value) => {

                const old = Reflect.get(this._values, property, value);
                const result = Reflect.set(this._values, property, value);
                if (reflect) {
                  let node = this;
                  let fail = false;
                  for (let i = 0; i < reflect.length - 1; i++) {
                    const subprop = reflect[i];
                    /* $lab:coverage:off$ */
                    if (typeof node === 'object' && node !== null && node.hasOwnProperty(subprop)) {
                    /* $lab:coverage:on */
                      node = node[subprop];
                    } else {
                      fail = true;
                    }
                  }
                  if (!fail) {
                    Reflect.set(node, reflect[reflect.length - 1], value);
                    node = value;
                  }
                }
                this.ecs._sendChange(this, 'set', property, old, value);
                return result;
              },
              get: () => {
                if (!reflect) {
                  return Reflect.get(this._values, property);
                }
                let node = this;
                let fail = false;
                for (let i = 0; i < reflect.length - 1; i++) {
                  const subprop = reflect[i];
                  /* $lab:coverage:off$ */
                  if (typeof node === 'object' && node !== null && node.hasOwnProperty(subprop)) {
                  /* $lab:coverage:on */
                    node = node[subprop];
                  } else {
                    fail = true;
                  }
                }
                if (!fail) {
                  return Reflect.get(node, reflect[reflect.length - 1]);
                } else {
                  return Reflect.get(this._values, property);
                }
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
    const values = { ...initialValues };
    delete values.type;
    delete values.entity;
    delete values.id;
    Object.assign(this, values);
    this._ready = true;
    this.ecs._sendChange(this, 'addComponent');
    for (const init of this._init) {
      init.apply(this);
    }
  }

  destroy(remove=true) {

    for (const destroy of this._destroy) {
      destroy.apply(this);
    }
    if (remove) {
      this.entity.removeComponent(this, false, false);
    }
    this._ready = false;
  }

  stringify() {

    return JSON.stringify(this.getObject());
  }

  getObject() {

    const serialize  = this.constructor.definition.serialize;
    let values = this._values;
    if (serialize) {
      /* $lab:coverage:off$ */
      if (serialize.skip) return undefined;
      /* $lab:coverage:on$ */
      if (serialize.ignore.length > 0) {
        values = {}
        const props = new Set([...serialize.ignore]);
        for (const prop of Object.keys(this._values).filter(prop => !props.has(prop))) {
          values[prop] = this._values[prop];
        }
      }
    }
    return Object.assign({ id: this.id, type: this.type }, values, this._refs);
  }

}

BaseComponent.definition = {
  properties: {
  },
  many: false,
  serialize: {
    skip: false,
    ignore: [],
  }
};

module.exports = BaseComponent;
