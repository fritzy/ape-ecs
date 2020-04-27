const UUID = require('uuid/v1');
//const BaseComponent = require('./component');
const Entity = require('./entity');
const Query = require('./query');
const BaseComponent = require('./component');

const componentMethods = new Set(['stringify', 'clone', 'getObject', Symbol.iterator]);
class ECS {

  constructor() {

    this.ticks = 0;
    this.entities = new Map();
    this.types = {};
    this.tags = new Set();
    this.entityComponents = new Map();
    this.checkIndexEntities = new Set();
    this.components = new Map();
    this.queryIndexes = new Map();
    this.subscriptions = new Map();
    this.systems = new Map();
    this.refs = {};
  }

  tick() {

    this.ticks++;
    this.updateIndexes();
    return this.ticks;
  }

  addRef(target, entity, component, prop, sub, type) {
    if (!this.refs[target]) {
      this.refs[target] = new Set();
    }
    const eInst = this.getEntity(target);
    if(!eInst.refs.hasOwnProperty(type)) {
      eInst.refs[type] = new Map();
    }
    let count = eInst.refs[type].get(entity);
    /* $lab:coverage:off$ */
    if (count === undefined) {
      count = 0
    }
    /* $lab:coverage:on$ */
    eInst.refs[type].set(entity, count + 1);
    this.refs[target].add([entity, component, prop, sub].join('...'));
  }

  deleteRef(target, entity, component, prop, sub, type) {

    const eInst = this.getEntity(target);
    let count = eInst.refs[type].get(entity);
    count--;
    /* $lab:coverage:off$ */
    if (count < 1) {
      eInst.refs[type].delete(entity);
    } else {
      eInst.refs[type].set(entity, count);
    }
    /* $lab:coverage:on$ */
    if (eInst.refs[type].size === 0) {
      delete eInst.refs[type];
    }
    /* $lab:coverage:off$ */
    /* $lab:coverage:on$ */
    this.refs[target].delete([entity, component, prop, sub].join('...'));
    if (this.refs[target].size === 0) {
      delete this.refs[target];
    }
  }

  registerTags(tags) {
    if (Array.isArray(tags)) {
      for (const tag of tags) {
        this.entityComponents.set(tag, new Set());
      }
      return;
    }
    this.entityComponents.set(tags, new Set());
  }


  registerComponent(name, definition = {}) {
    const klass = class Component extends BaseComponent {}
    klass.definition = definition;
    Object.defineProperty(klass, 'name', {value: name});
    this.registerComponentClass(klass);
    return klass;
  }

  registerComponentClass(klass) {

    klass.subbed = false;
    klass.prototype.ecs = this;
    this.types[klass.name] = klass;
    this.entityComponents.set(klass.name, new Set());
    this.components.set(klass.name, new Set());
  }

  createEntity(definition) {

    return new Entity(this, definition);
  }

  removeEntity(id) {

    let entity;
    if (id instanceof Entity) {
      entity = id;
      id = entity.id;
    } else {
      entity = this.getEntity(id);
    }
    entity.destroy();
  }

  getEntity(entityId) {

    return this.entities.get(`${entityId}`);
  }

  getEntities(type) {

    const results = [...this.entityComponents.get(type)];
    return new Set(results.map((id) => this.getEntity(id)));
  }

  createQuery(init) {

    return new Query(this, init);
  }

  subscribe(system, type) {

    if (!this.subscriptions.has(type)) {
      this.types[type].subbed = true;
      this.subscriptions.set(type, new Set());
    }
    this.subscriptions.get(type).add(system);
  }

  addSystem(group, system) {

    if (typeof system === 'function') {
      system = new system(this);
    }
    if (!this.systems.has(group)) {
      this.systems.set(group, new Set());
    }
    this.systems.get(group).add(system);
  }

  runSystemGroup(group) {

    const systems = this.systems.get(group);
    if (!systems) return;
    for (const system of systems) {
      let entities;
      system.update(this.ticks, entities);
      system.lastTick = this.ticks;
      if (system.changes.length !== 0) {
        system.changes = [];
      }
    }
  }

  _checkEntity(entity) {

    this.checkIndexEntities.add(entity);
  }

  updateIndexes(entity) {

    if (entity !== undefined) {
      return this._updateIndexesEntity(entity);
    }
    for (const entity of this.checkIndexEntities) {
      this._updateIndexesEntity(entity);
    }
  }

  _updateIndexesEntity(entity) {

    for (const query of this.queryIndexes) {
      query[1].update(entity);
    }
    this.checkIndexEntities.delete(entity);
  }

  _sendChange(component, op, key, old, value) {

    if (!component._ready) return;
    component.updated = component.entity.updatedValues = this.ticks;
    if (!component.constructor.subbed) return;
    const systems = this.subscriptions.get(component.type);
    /* $lab:coverage:off$ */
    if (systems) {
    /* $lab:coverage:on$ */
      const change = { component, op, key, old, value };
      for (const system of systems) {
        system._sendChange(change);
      }
    }
  }

}

module.exports = ECS;
