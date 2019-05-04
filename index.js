const UUID = require('uuid/v1');
const BaseComponent = require('./component');
const Entity = require('./entity');
const QueryCache = require('./querycache');

const componentMethods = new Set(['stringify', 'clone', 'getObject', Symbol.iterator]);
class ECS {

  constructor() {

    this.ticks = 0;
    this.entities = new Map();
    this.types = {};
    this.entityComponents = new Map();
    this.components = new Map();
    this.queryCache = new Map();
    this.subscriptions = new Map();
    this.systems = new Map();
  }

  tick() {

    this.ticks++;
    return this.ticks;
  }

  registerComponent(name, definition = {}) {

    const klass = class Component extends BaseComponent {}
    klass.definition = definition;
    Object.defineProperty(klass, 'name', {value: name});
    this.registerComponentClass(klass);
    return klass;
  }

  registerComponentClass(klass) {

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
    this._clearEntityFromCache(entity);
    entity.destroy();
  }

  getEntity(entityId) {

    return this.entities.get(`${entityId}`);
  }

  queryEntities(args) {

    if (typeof args === 'string') {
      args = {
        cache: args
      };
    }
    const { has, hasnt, cache, updatedValues, updatedComponents } = Object.assign({
      has: [],
      hasnt: [],
      cache: false,
      updatedValues: 0,
      updatedComponents: 0
    }, args);

    let query;
    if (cache) {
      query = this.queryCache.get(cache);
    }
    if (!query) {
      query = new QueryCache(this, has, hasnt);
    }
    if (cache) {
      this.queryCache.set(cache, query);
    }
    return query.query(updatedValues, updatedComponents);
  }

  setQuery(system, has, hasnt) {

    const query = new QueryCache(this, has, hasnt);
    this.queryCache.set(system, query);
  }

  getComponents(name) {

    return [...this.components.get(name)];
  }

  subscribe(system, type) {

    if (!this.subscriptions.has(type)) {
      this.subscriptions.set(type, new Set());
    }
    this.subscriptions.get(type).add(system);
  }

  unsubscribe(system, type) {

    const systems = this.subscriptions.get(type);
    if (systems) {
      systems.delete(system);
    }
  }

  addSystem(group, system) {

    if (!this.systems.has(group)) {
      this.systems.set(group, new Set());
    }
    this.systems.get(group).add(system);
  }

  removeSystem(group, system) {

    const systems = this.systems.get(group);
    if (systems) {
      systems.delete(system);
    }
  }

  runSystemGroup(group) {

    const systems = this.systems.get(group);
    if (systems) {
      for (const system of systems) {
        let entities;
        if (this.queryCache.has(system)) {
          entities = this.queryChache.get(system);
        }
        system.update(this.ticks, entities);
        system.lastTick = this.ticks;
        if (system.changes.length !== 0) {
          system.changes = [];
        }
      }
    }
  }

  _clearEntityFromCache(entity) {

    for (const query of this.queryCache) {
      query[1].clearEntity(entity);
    }

  }

  _updateCache(entity) {

    for (const query of this.queryCache) {
      query[1].updateEntity(entity);
    }
  }

  _sendChange(component, op, key, old, value) {

    if (!component._ready) return;
    component.updated = component.entity.updatedValues = this.ticks;
    const systems = this.subscriptions.get(component.type);
    if (systems) {
      const change = { component, op, key, old, value };
      for (const system of systems) {
        system._sendChange(change);
      }
    }
  }

}

module.exports = ECS;

