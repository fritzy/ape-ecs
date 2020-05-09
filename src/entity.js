const BaseComponent = require('./component');
const UUID = require('uuid/v1');

class Entity {

  constructor(world, definition = {}) {

    this.world = world;
    this.components = {};
    this.componentsByType = {};
    this.id = definition.id || UUID();
    this.world.entities.set(this.id, this);
    this.tags = new Set();

    this.updatedComponents = this.world.ticks;
    this.updatedValues = this.world.ticks;

    for (const key of Object.keys(definition)) {
      if (key === 'id') {
        this.id = definition.id;
        continue;
      }
      const constName = definition[key].type || key;
      const component = this.world.componentTypes[constName];
      this.addComponent(component, definition[key], key);
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
    this.world._sendChange({
      op: 'update',
      component: comp
    });
    return comp;
  }

  getComponents(type) {

    return this.componentsByType[type];
  }

  getMutableComponents(type) {

    const components = this.componentsByType[type];
    for (comp of components) {
      comp._meta.updated = this.world.ticks;
      this.world._sendChange({
        op: 'update',
        component: comp
      });
    }
    return components;
  }

  addTag(tag) {

    this.tags.add(tag);
    this.updatedComponents = this.world.ticks;
    this.world.entityComponents.get(tag).add(this.id);
    this.world._entityUpdated(this);
  }

  removeTag(tag) {

    this.tags.delete(tag);
    this.updatedComponents = this.world.ticks;
    this.world.entityComponents.get(tag).delete(this.id);
    this.world._entityUpdated(this);
  }

  addComponent(component, properties, lookup) {

    if (typeof component === 'string') {
      component = this.world.componentTypes[component];
    }
    const name = component.name;
    lookup = lookup || component.name;
    const comp = new component(this, properties);
    if (lookup === '*') {
      lookup = comp.id;
    }
    this.components[lookup] = comp;
    comp._meta.lookup = lookup;
    if (!this.componentsByType[name]) {
      this.componentsByType[name] = new Set();
    }
    this.componentsByType[name].add(comp);
    this.world._addEntityComponent(name, this);
    this.world._entityUpdated(this);
    return comp;
  }

  removeComponent(component) {

    if (typeof component === 'string') {
      component = this.components[component];
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

  getObject() {

    const obj = {};
    for (const key of Object.keys(this.components)) {
      obj[key] = this.components[key].getObject();
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
        for (const prop of path) {
          target = target[prop];
        }
        if (sub === '__set__') {
          target.delete(this);
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
