const BaseComponent = require('./component');
const IdGenerator = require('./util').IdGenerator;
const idGen = new IdGenerator();

class Entity {

  constructor() {
    this.types = {};
    this.c = {};
    this.id = '';
    this.tags = new Set();
    this.updatedComponents = 0;
    this.updatedValues = 0;
    this.destroyed = false;
    this.ready = false;
    this.bitmask = 0n;
  }

  _setup(definition) {
    this.destroyed = false;
    if (definition.id) {
      this.id = definition.id;
    } else {
      this.id = idGen.genId();
    }
    this.world.entities.set(this.id, this);

    this.updatedComponents = this.world.currentTick;

    if (definition.tags) {
      for (const tag of definition.tags) {
        this.addTag(tag);
      }
    }

    if (definition.components) {
      for (const compdef of definition.components) {
        this.addComponent(compdef);
      }
    }

    if (definition.c) {
      const defs = definition.c;
      for (const key of Object.keys(defs)) {
        const comp = {
          ...defs[key],
          key
        };
        if (!comp.type) comp.type = key;
        this.addComponent(comp);
      }
    }
    this.ready = true;
    this.world._entityUpdated(this);
  }

  has(type) {
    if (typeof type !== 'string') {
      type = type.name;
    }
    return this.tags.has(type) || this.types.hasOwnProperty(type);
  }

  setKey(component, key) {
  }

  getOne(type) {
    if (typeof type !== 'string') {
      type = type.name;
    }
    let component;
    // istanbul ignore else
    if (this.types[type]) {
      component = [...this.types[type]][0];
    }
    return component;
  }

  getComponents(type) {
    if (typeof type !== 'string') {
      type = type.name;
    }
    return this.types[type] || new Set();
  }

  addTag(tag) {
    // istanbul ignore next
    if (!this.world.registry.tags.has(tag)) {
      throw new Error(`addTag "${tag}" is not registered. Type-O?`);
    }
    if (this.tags.has(tag)) {
      return;
    }
    this.tags.add(tag);
    this.bitmask |= 1n << this.world.registry.typenum.get(tag);
    this.updatedComponents = this.world.currentTick;
    this.world.entitiesByComponent[tag].add(this.id);
    if (this.ready) {
      this.world._entityUpdated(this);
    }
  }

  removeTag(tag) {
    if (!this.tags.has(tag)) {
      return;
    }
    this.bitmask &= ~(1n << this.world.registry.typenum.get(tag)); 
    this.tags.delete(tag);
    this.updatedComponents = this.world.currentTick;
    this.world.entitiesByComponent[tag].delete(this.id);
    this.world._entityUpdated(this);
  }

  addComponent(properties) {
    const type = properties.type;
    const pool = this.world.registry.pool.get(type);
    if (pool === undefined) {
      throw new Error(`Component "${type}" has not been registered.`);
    }
    const comp = pool.get(this.world, this, properties);
    if (!this.types[type]) {
      this.types[type] = new Set();
    }
    if (this.types[type].size === 0) {
      this.bitmask |= 1n << this.world.registry.typenum.get(type);
    }
    this.types[type].add(comp);
    this.c[comp.key] = comp;
    this.world._addEntityComponent(type, this);
    this.updatedComponents = this.world.currentTick;
    if (this.ready) {
      this.world._entityUpdated(this);
    }
    return comp;
  }

  removeComponent(component) {
    if (typeof component === 'string') {
      component = this.c[component];
    }
    if (component === undefined) {
      return false;
    }
    if (component.key) {
      delete this.c[component.key];
    }
    this.types[component.type].delete(component);

    if (this.types[component.type].size === 0) {
      this.bitmask &= ~(1n << this.world.registry.typenum.get(component.type)); 
      delete this.types[component.type];
    }
    this.world._deleteEntityComponent(component);
    this.world._entityUpdated(this);
    component.destroy();
    return true;
  }

  getObject(componentIds = true) {
    const obj = {
      id: this.id,
      tags: [...this.tags],
      components: [],
      c: {}
    };
    for (const type of Object.keys(this.types)) {
      for (const comp of this.types[type]) {
        if (!comp.constructor.serialize) {
          continue;
        }
        if (comp.key) {
          obj.c[comp.key] = comp.getObject(componentIds);
        } else {
          obj.components.push(comp.getObject(componentIds));
        }
      }
    }
    return obj;
  }

  destroy() {

    if (this.destroyed) return;
    this.ready = false;

    for (const type of Object.keys(this.types)) {
      for (const component of this.types[type]) {
        this.removeComponent(component);
      }
    }
    for (const tag of this.tags) {
      this.removeTag(tag);
    }
    this.world._entityUpdated(this);
    this.world.entities.delete(this.id);
    this.destroyed = true;
    this.world.entityPool.destroy(this);
    this.world._clearIndexes(this);
  }
}

module.exports = Entity;
