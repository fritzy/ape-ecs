/*
 * @module ecs/ECS
 * @type {class}
 */
const UUID = require('uuid/v1');
const Entity = require('./entity');
const Query = require('./query');
const Component = require('./component');
const ComponentPool = require('./componentpool');
const EntityPool = require('./entitypool');

const componentMethods = new Set(['stringify', 'clone', 'getObject', Symbol.iterator]);

/**
 * Main library class for registering Components, Systems, Queries,
 * and runnning Systems.
 * Create multiple World instances in order to have multiple collections.
 * @exports World
 */
module.exports = class World {

  constructor(config) {

    this.config = Object.assign({
      trackChanges: true,
      entityPool: 100
    }, config);
    this.ticks = 0;
    this.entities = new Map();
    this.types = {};
    this.tags = new Set();
    this.entitiesByComponent = {};
    this.componentsById = new Map();
    this.entityReverse = {};
    this.updatedEntities = new Set();
    this.componentTypes = {};
    this.components = new Map();
    this.queryIndexes = new Map();
    this.subscriptions = new Map();
    this.systems = new Map();
    this.refs = {};
    this.componentPool = new Map();
    this.entityPool = new EntityPool(this, this.config.entityPool);
  }

  /**
   * Called in order to increment ecs.ticks, update indexed queries, and update lookups.
   * @method module:ECS#tick
   */
  tick() {

    this.ticks++;
    this.updateIndexes();
    return this.ticks;
  }

  _addRef(target, entity, component, prop, sub, lookup, type) {

    if (!this.refs[target]) {
      this.refs[target] = new Set();
    }
    const eInst = this.getEntity(target);
    if(!this.entityReverse.hasOwnProperty(target)) {
      this.entityReverse[target] = {};
    }
    if(!this.entityReverse[target].hasOwnProperty(lookup)) {
      this.entityReverse[target][lookup] = new Map();
    }
    const reverse = this.entityReverse[target][lookup];
    let count = reverse.get(entity);
    /* $lab:coverage:off$ */
    if (count === undefined) {
      count = 0
    }
    /* $lab:coverage:on$ */
    reverse.set(entity, count + 1);
    this.refs[target].add([entity, component, prop, sub].join('...'));
    this._sendChange({
      op: 'addRef',
      component: component,
      type: type,
      target,
      entity,
      prop
    });
  }

  _deleteRef(target, entity, component, prop, sub, lookup, type) {

    const ref = this.entityReverse[target][lookup];
    let count = ref.get(entity);
    count--;
    /* $lab:coverage:off$ */
    if (count < 1) {
      ref.delete(entity);
    } else {
      ref.set(entity, count);
    }
    /* $lab:coverage:on$ */
    if (ref.size === 0) {
      delete ref[lookup];
    }
    /* $lab:coverage:off$ */
    /* $lab:coverage:on$ */
    this.refs[target].delete([entity, component, prop, sub].join('...'));
    if (this.refs[target].size === 0) {
      delete this.refs[target];
    }
    this._sendChange({
      op: 'deleteRef',
      component,
      type: type,
      target,
      entity,
      prop
    });
  }

  /**
   * @typedef {Object} definition
   * @property {Object} properites
   * @property {function} init
   */

  /**
   * If you're going to use tags, you needs to let the ECS instance know.
   * @method module:ECS#registerTags
   * @param {string[]|string} tags - Array of tags to register, or a single tag.
   * @example
   * ecs.registerTags['Item', 'Blocked']);
   */
  registerTags(tags) {
    if (Array.isArray(tags)) {
      for (const tag of tags) {
        this.entitiesByComponent[tag] = new Set();
      }
      return;
    }
    this.entitiesByComponent[tags] = new Set();
  }

  registerComponent(name, definition, spinup=1) {

    if (!definition.properties) definition.properties = {};

    const klass = class CustomComponent extends Component {};

    const props = definition.properties;
    const primitive = {};
    const special = {};
    const fields = Object.keys(definition.properties);
    for (const field of fields) {
      if (typeof props[field] === 'function') {
        special[field] = props[field];
        continue;
      }
      primitive[field] = props[field];
      Object.defineProperty(klass.prototype, field, {
        enumerable: true,
        get() {
          return this._meta.values[field];
        },
        set(value) {

          this._meta.values[field] = value;
          this._updated();
          return true;
        }
      });
    }

    klass.prototype.onInit = definition.init || function onInit() {};
    klass.prototype.onDestroy = definition.destroy || function onDestroy() {};
    klass.prototype.type = name;
    Object.defineProperty(klass.prototype, 'world', {
      value: this, enumerable: false });
    klass.serialize = definition.serialize || {};
    klass.props = {
      fields,
      primitive,
      special
    };
    klass.subbed = false;
    Object.defineProperty(klass, 'name', { value: name });
    this.componentTypes[name] = klass;
    this.entitiesByComponent[name] = new Set();
    this.componentPool.set(name, new ComponentPool(this, name, spinup));
  }

  createEntity(definition) {

    return this.entityPool.get(definition);
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

    return this.entities.get(entityId);
  }

  getEntities(type) {

    const results = [...this.entitiesByComponent[type]];
    return new Set(results.map((id) => this.getEntity(id)));
  }

  createQuery(init) {

    return new Query(this, init);
  }

  subscribe(system, type) {

    if (!this.subscriptions.has(type)) {
      this.componentTypes[type].subbed = true;
      this.subscriptions.set(type, new Set());
    }
    this.subscriptions.get(type).add(system);
  }

  _sendChange(operation) {

    if (this.componentTypes[operation.type].subbed) {
      const systems = this.subscriptions.get(operation.type);
      for (const system of systems) {
        system._recvChange(operation);
      }
    }
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
      system._preUpdate();
      system.update(this.ticks, entities);
      system._postUpdate();
      system.lastTick = this.ticks;
      if (system.changes.length !== 0) {
        system.changes = [];
      }
    }
  }

  _entityUpdated(entity) {

    // $lab:coverage:off$
    if (this.config.trackChanges) {
      this.updatedEntities.add(entity);
    }
    // $lab:coverage:on$
  }

  _addEntityComponent(name, entity) {

    this.entitiesByComponent[name].add(entity.id);
  }

  _deleteEntityComponent(component) {

    this.entitiesByComponent[component.type].delete(component._meta.entityId);
  }


  updateIndexes(entity) {

    if (entity !== undefined) {
      return this._updateIndexesEntity(entity);
    }
    for (const entity of this.updatedEntities) {
      this._updateIndexesEntity(entity);
    }
    this.updatedEntities.clear();
  }

  _updateIndexesEntity(entity) {

    for (const query of this.queryIndexes) {
      query[1].update(entity);
    }
  }

}
