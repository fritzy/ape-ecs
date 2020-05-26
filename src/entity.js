const BaseComponent = require('./component');
const genId = require('./util').genId;
const UUID = require('uuid/v1');

class Entity {

  constructor(world, definition = {}) {

    this.world = world;
    this.components = {};
    this.componentsByType = {};
    this.id = definition.id || genId();
    delete definition.id;
    this.world.entities.set(this.id, this);
    this.tags = new Set();

    this.updatedComponents = this.world.ticks;
    this.updatedValues = this.world.ticks;

    if (definition.tags) {
      for (const tag of definition.tags) {
        this.addTag(tag, true);
      }
      delete definition.tags;
    }

    for (const key of Object.keys(definition)) {
      const name = definition[key].type || key;
      this.addComponent(name, definition[key], key, false);
    }
  }

  has(type) {

    return this.world.entitiesByComponent[type].has(this.id)
  }

  getComponent(lookup) {

    return this.components[lookup];
  }

  getMutableComponent(lookup) {

    const comp = this.components[lookup];
    comp._meta.updated = this.world.ticks;
    this.updatedValues = this.world.ticks;
    this.world._sendChange({
      op: 'update',
      component: comp.id,
      entity: comp._meta.entity.id,
      type: comp.type
    });
    return comp;
  }

  getComponents(type) {

    return this.componentsByType[type];
  }

  getMutableComponents(type) {

    const components = this.componentsByType[type];
    this.updatedValues = this.world.ticks;
    for (comp of components) {
      comp._meta.updated = this.world.ticks;
      this.world._sendChange({
        op: 'update',
        component: comp.id,
        entity: comp._meta.entity.id,
        type: comp.type
      });
    }
    return components;
  }

  addTag(tag, skipUpdate=false) {

    this.tags.add(tag);
    this.updatedComponents = this.world.ticks;
    this.world.entitiesByComponent[tag].add(this.id);
    if (!skipUpdate) {
      this.world._entityUpdated(this);
    }
  }

  removeTag(tag) {

    this.tags.delete(tag);
    this.updatedComponents = this.world.ticks;
    this.world.entitiesByComponent[tag].delete(this.id);
    this.world._entityUpdated(this);
  }

  addComponent(name, properties, lookup, skipUpdate=false) {

    const pool = this.world.componentPool[name];
    if (pool === undefined) {
      throw new Error(`Component "${name}" has not been registered.`);
    }
    lookup = lookup || name;
    const comp = pool.get(this, properties, lookup);
    this.components[comp._meta.lookup] = comp;
    comp._meta.lookup = lookup;
    if (!this.componentsByType[name]) {
      this.componentsByType[name] = new Set();
    }
    this.componentsByType[name].add(comp);
    this.world._addEntityComponent(name, this);
    if (!skipUpdate) {
      this.updatedComponents = this.world.ticks;
      this.world._entityUpdated(this);
    }
    return comp;
  }

  removeComponent(component) {

    if (typeof component === 'string') {
      component = this.components[component];
    }
    if (component === undefined) {
      throw new Error('Cannot remove undefined component.');
    }
    delete this.components[component._meta.lookup];
    this.componentsByType[component.type].delete(component);

    if (this.componentsByType[component.type].size === 0) {
      delete this.componentsByType[component.type];
    }
    this.world._deleteEntityComponent(component);
    this.world._entityUpdated(this);
    component.destroy();
  }

  getObject(componentIds=true) {

    const obj = {};
    for (const key of Object.keys(this.components)) {
      const comp = this.components[key];
      if (comp.constructor.serialize && comp.constructor.serialize.skip) {
        continue;
      }
      obj[key] = comp.getObject(componentIds);
    }
    obj.id = this.id;
    return obj;
  }

  destroy() {

    if (this.world.refs[this.id]) {
      for (const ref of this.world.refs[this.id]) {
        const [entityId, componentId, prop, sub] = ref.split('...');
        const entity = this.world.getEntity(entityId);
        if (!entity) continue;
        const component = entity.world.componentsById.get(componentId);
        if (!component) continue;
        const path = prop.split('.');

        let target = component;
        let parent = target;
        for (const prop of path) {
          parent = target;
          target = target[prop];
        }
        if (sub === '__set__') {
          target.delete(this);
        } else if (sub === '__obj__') {
          parent.delete(path[path.length - 1]);
        } else {
          target.set(null);
        }
      }
    }
    for (const lookup of Object.keys(this.components)) {
      this.removeComponent(this.components[lookup]);
    }
    this.world.entities.delete(this.id);
    delete this.world.entityReverse[this.id];
  }
}

module.exports = Entity;
