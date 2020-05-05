const BaseComponent = require('./component');
const UUID = require('uuid/v1');

class Entity {

  constructor(world, definition = {}) {

    this.world = world;
    this.components = {};
    this.componentById = {};
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

  has(tagOrComponent) {

    if (this.tags.has(tagOrComponent)) {
      return true;
    }
    return (this.components.hasOwnProperty(tagOrComponent));
  }

  getComponent(lookup) {

    return this.components[lookup];
  }

  getMutableComponent(lookup) {

    const comp = this.components[lookup];
    comp._meta.updated = this.world.ticks;
    return comp;
  }

  addTag(tag) {

    this.tags.add(tag);
    this.updatedComponents = this.world.ticks;
    this.world.entityComponents.get(tag).add(this.id);
    this.world.entityUpdated(this);
  }

  removeTag(tag) {

    this.tags.delete(tag);
    this.updatedComponents = this.world.ticks;
    this.world.entityComponents.get(tag).delete(this.id);
    this.world.entityUpdated(this);
  }

  addComponent(component, properties, lookup) {

    const name = component.name;
    lookup = lookup || component.name;
    const comp = new component(this, properties);
    this.components[lookup] = comp;
    comp._meta.lookup = lookup;
    if (!this.componentsByType[name]) {
      this.componentsByType[name] = new Set();
    }
    this.componentsByType[name].add(comp);
    this.componentById[comp.id] = comp;
    this.world._addEntityComponent(name, this);
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
        // remove coverage because I can't think of how this would go wrng
        /* $lab:coverage:off$ */
        if (!entity) continue;
        const component = entity.componentById[componentId];
        if (!component) continue;
        /* $lab:coverage:on$ */
        const path = prop.split('.');
        if (!sub) {
          const last = path[path.length - 1];
          let t2 = component;
          /* $lab:coverage:off$ */
          for (let i = 0; i < path.length - 1; i++) {
            t2 = t2[path[i]];
          }
          /* $lab:coverage:on$ */
          t2[last] = null;
          continue;
        }

        let target = component;
        for (const prop of path) {
          target = target[prop];
        }
        if (sub === '__set__') {
          target.delete(this);
        } else {
          target[sub].set(null);
        }
      }
    }
    this.world.entities.delete(this.id);
    delete this.world.entityReverse[this.id];
  }

}

module.exports = Entity;
