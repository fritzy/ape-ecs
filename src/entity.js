const BaseComponent = require('./component');
const IdGenerator = require('./util').IdGenerator;

const idGen = new IdGenerator();

class Entity {

  constructor() {

    this.types = {};
    this.id = '';
    this.tags = new Set();
    this.updatedComponents = 0;
    this.updatedValues = 0;
  }

  _setup(definition) {

    if (definition.id)  {
      this.id = definition.id;
    } else {
      this.id = idGen.genId();
    }
    this.world.entities.set(this.id, this);

    this.updatedComponents = this.world.currentTick;
    this.updatedValues = this.world.currentTick;

    if (definition.tags) {
      for (const tag of definition.tags) {
        this.addTag(tag, true);
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
          lookup: key
        };
        if (!comp.type) comp.type = key;
        this.addComponent(comp);
      }
    }
  }


  has(type) {

    return this.world.entitiesByComponent[type].has(this.id)
  }

  getComponents(type) {

    return this.types[type];
  }

  addTag(tag, skipUpdate=false) {

    this.tags.add(tag);
    this.updatedComponents = this.world.currentTick;
    this.world.entitiesByComponent[tag].add(this.id);
    if (!skipUpdate) {
      this.world._entityUpdated(this);
    }
  }

  removeTag(tag) {

    this.tags.delete(tag);
    this.updatedComponents = this.world.currentTick;
    this.world.entitiesByComponent[tag].delete(this.id);
    this.world._entityUpdated(this);
  }

  addComponent(properties) {

    const type = properties.type;
    const pool = this.world.componentPool.get(type);
    if (pool === undefined) {
      throw new Error(`Component "${type}" has not been registered.`);
    }
    const comp = pool.get(this, properties);
    /*
    if (properties.lookup) {
      this[properties.lookup] = comp;
    }
    */
    if (!this.types[type]) {
      this.types[type] = new Set();
    }
    this.types[type].add(comp);
    this.world._addEntityComponent(type, this);
    this.updatedComponents = this.world.currentTick;
    this.world._entityUpdated(this);
    return comp;
  }

  removeComponent(component) {

    if (typeof component === 'string') {
      component = this[component];
    }
    if (component === undefined) {
      return false;
    }
    if (component.lookup) {
      delete this[component.lookup];
    }
    this.types[component.type].delete(component);

    if (this.types[component.type].size === 0) {
      delete this.types[component.type];
    }
    this.world._deleteEntityComponent(component);
    this.world._entityUpdated(this);
    component.destroy();
    return true;
  }

  getObject(componentIds=true) {

    const obj = {
      id: this.id,
      tags: [...this.tags],
      components: [],
      c: {}
    };
    for (const type of Object.keys(this.types)) {
      for (const comp of this.types[type]) {
        // $lab:coverage:off$
        if (comp.constructor.serialize && comp.constructor.serialize.skip) {
          continue;
        }
        // $lab:coverage:on$
        if (comp.lookup) {
          obj.c[comp.lookup] = comp.getObject(componentIds);
        } else {
          obj.components.push(comp.getObject(componentIds));
        }
      }
    }
    return obj;
  }

  destroy() {

    if (this.world.refs[this.id]) {
      for (const ref of this.world.refs[this.id]) {
        const [entityId, componentId, prop, sub] = ref.split('...');
        const entity = this.world.getEntity(entityId);
        // istanbul ignore next
        if (!entity) continue;
        const component = entity.world.componentsById.get(componentId);
        // istanbul ignore next
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
          delete parent[path[1]];
        } else {
          parent[prop] = null
        }
      }
    }
    for (const type of Object.keys(this.types)) {
      for (const component of this.types[type]) {
        this.removeComponent(component);
      }
    }
    this.tags.clear();
    this.world.entities.delete(this.id);
    delete this.world.entityReverse[this.id];
    this.world.entityPool.release(this);
  }
}

module.exports = Entity;
