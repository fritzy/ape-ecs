const BaseComponent = require('./component');
const IdGenerator = require('./util').IdGenerator;

const idGen = new IdGenerator();

class Entity {

  constructor() {

    this.component = {};
    this.c = this.component;
    this.componentsByType = {};
    this.id = '';
    this.tags = new Set();
    this.updatedComponents = 0;
    this.updatedValues = 0;
  }

  _setup(definition) {

    if (definition.id)  {
      this.id = definition.id;
      delete definition.id;
    } else {
      this.id = idGen.genId();
    }
    this.world.entities.set(this.id, this);

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
      this.addComponent(name, definition[key], key);
    }
  }

  has(type) {

    return this.world.entitiesByComponent[type].has(this.id)
  }

  getComponents(type) {

    return this.componentsByType[type];
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

  addComponent(name, properties, lookup) {

    const pool = this.world.componentPool.get(name);
    if (pool === undefined) {
      throw new Error(`Component "${name}" has not been registered.`);
    }
    lookup = lookup || name;
    const comp = pool.get(this, properties, lookup);
    this.component[comp._meta.lookup] = comp;
    if (!this.componentsByType[name]) {
      this.componentsByType[name] = new Set();
    }
    this.componentsByType[name].add(comp);
    this.world._addEntityComponent(name, this);
    this.updatedComponents = this.world.ticks;
    this.world._entityUpdated(this);
    return comp;
  }

  getComponent(lookup) {

    return this.component[lookup];
  }

  removeComponent(component) {

    if (typeof component === 'string') {
      component = this.component[component];
    }
    if (component === undefined) {
      return false;
    }
    delete this.component[component._meta.lookup];
    this.componentsByType[component.type].delete(component);

    if (this.componentsByType[component.type].size === 0) {
      delete this.componentsByType[component.type];
    }
    this.world._deleteEntityComponent(component);
    this.world._entityUpdated(this);
    component.destroy();
    return true;
  }

  getObject(componentIds=true) {

    const obj = {};
    for (const key of Object.keys(this.component)) {
      const comp = this.component[key];
      // $lab:coverage:off$
      if (comp.constructor.serialize && comp.constructor.serialize.skip) {
        continue;
      }
      // $lab:coverage:on$
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
        // $lab:coverage:off$
        if (!entity) continue;
        // $lab:coverage:on$
        const component = entity.world.componentsById.get(componentId);
        // $lab:coverage:off$
        if (!component) continue;
        // $lab:coverage:on$
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
          delete parent[path[1]];
        } else {
          parent[prop] = null
        }
      }
    }
    for (const lookup of Object.keys(this.component)) {
      this.removeComponent(this.component[lookup]);
    }
    this.tags.clear();
    this.world.entities.delete(this.id);
    delete this.world.entityReverse[this.id];
    this.world.entityPool.release(this);
  }
}

module.exports = Entity;
