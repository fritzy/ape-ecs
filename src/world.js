/*
 * @module ecs/ECS
 * @type {class}
 */
const Entity = require('./entity');
const Query = require('./query');
const ComponentPool = require('./componentpool');
const EntityPool = require('./entitypool');
const setupApeDestroy = require('./cleanup');

const componentReserved = new Set([
  'constructor',
  'init',
  'type',
  'key',
  'destroy',
  'preDestroy',
  'postDestroy',
  'getObject',
  '_setup',
  '_reset',
  'update',
  'clone',
  '_meta',
  '_addRef',
  '_deleteRef',
  'prototype'
]);

/**
 * Main library class for registering Components, Systems, Queries,
 * and runnning Systems.
 * Create multiple World instances in order to have multiple collections.
 * @exports World
 */
module.exports = class World {
  constructor(config) {
    this.config = Object.assign(
      {
        trackChanges: true,
        entityPool: 10,
        cleanupPools: true,
        useApeDestroy: false
      },
      config
    );
    this.currentTick = 0;
    this.entities = new Map();
    this.types = {};
    this.tags = new Set();
    this.entitiesByComponent = {};
    this.componentsById = new Map();
    this.entityReverse = {};
    this.updatedEntities = new Set();
    this.componentTypes = {};
    this.components = new Map();
    this.queries = [];
    this.subscriptions = new Map();
    this.systems = new Map();
    this.refs = {};
    this.componentPool = new Map();
    this._statCallback = null;
    this._statTicks = 0;
    this._nextStat = 0;
    this.entityPool = new EntityPool(this, this.config.entityPool);
    if (this.config.useApeDestroy) {
      setupApeDestroy(this);
    }
  }

  /**
   * Called in order to increment ecs.currentTick, update indexed queries, and update key.
   * @method module:ECS#tick
   */
  tick() {
    if (this.config.useApeDestroy) {
      this.runSystems('ApeCleanup');
    }
    this.currentTick++;
    this.updateIndexes();
    this.entityPool.release();
    // istanbul ignore else
    if (this.config.cleanupPools) {
      this.entityPool.cleanup();
      for (const [key, pool] of this.componentPool) {
        pool.cleanup();
      }
    }
    if (this._statCallback) {
      this._nextStat += 1;
      if (this._nextStat >= this._statTicks) {
        this._outputStats();
      }
    }
    return this.currentTick;
  }

  getStats() {
    const stats = {
      entity: {
        active: this.entities.size,
        pooled: this.entityPool.pool.length,
        target: this.entityPool.targetSize
      },
      components: {}
    };
    for (const [key, pool] of this.componentPool) {
      stats.components[key] = {
        active: pool.active,
        pooled: pool.pool.length,
        target: pool.targetSize
      };
    }
    return stats;
  }

  logStats(freq, callback) {
    // istanbul ignore next
    if (callback === undefined) {
      callback = console.log;
    }
    this._statCallback = callback;
    this._statTicks = freq;
    this._nextStat = 0;
  }

  _outputStats() {
    const stats = this.getStats();
    this._nextStat = 0;
    let output = `${this.currentTick}, Entities: ${stats.entity.active} active, ${stats.entity.pooled}/${stats.entity.target} pooled`;
    for (const key of Object.keys(stats.components)) {
      const cstat = stats.components[key];
      output += `\n${this.currentTick}, ${key}: ${cstat.active} active, ${cstat.pooled}/${cstat.target} pooled`;
    }
    this._statCallback(output);
  }

  _addRef(target, entity, component, prop, sub, key, type) {
    if (!this.refs[target]) {
      this.refs[target] = new Set();
    }
    const eInst = this.getEntity(target);
    if (!this.entityReverse.hasOwnProperty(target)) {
      this.entityReverse[target] = {};
    }
    if (!this.entityReverse[target].hasOwnProperty(key)) {
      this.entityReverse[target][key] = new Map();
    }
    const reverse = this.entityReverse[target][key];
    let count = reverse.get(entity);
    /* $lab:coverage:off$ */
    if (count === undefined) {
      count = 0;
    }
    /* $lab:coverage:on$ */
    reverse.set(entity, count + 1);
    this.refs[target].add([entity, component, prop, sub].join('...'));
    this._sendChange({
      op: 'addRef',
      component: component,
      type: type,
      property: prop,
      target,
      entity
    });
  }

  _deleteRef(target, entity, component, prop, sub, key, type) {
    const ref = this.entityReverse[target][key];
    let count = ref.get(entity);
    count--;
    // istanbul ignore else
    if (count < 1) {
      ref.delete(entity);
    } else {
      ref.set(entity, count);
    }
    if (ref.size === 0) {
      delete ref[key];
    }
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
      property: prop
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
  registerTags(...tags) {
    for (const tag of tags) {
      // istanbul ignore if
      if (this.entitiesByComponent.hasOwnProperty(tag)) {
        throw new Error(`Cannot register tag "${tag}", name is already taken.`);
      }
      this.entitiesByComponent[tag] = new Set();
      this.tags.add(tag);
    }
  }

  registerComponent(klass, spinup = 1) {
    if (klass.typeName && klass.name !== klass.typeName) {
      Object.defineProperty(klass, 'name', { value: klass.typeName });
    }
    const name = klass.name;
    // istanbul ignore if
    if (this.tags.has(name)) {
      throw new Error(`registerComponent: Tag already defined for "${name}"`);
    } /* istanbul ignore if */ else if (
      this.componentTypes.hasOwnProperty(name)
    ) {
      throw new Error(
        `registerComponent: Component already defined for "${name}"`
      );
    }
    this.componentTypes[name] = klass;
    if (!klass.registered) {
      klass.registered = true;
      klass.fields = Object.keys(klass.properties);
      klass.primitives = {};
      klass.factories = {};
      for (const field of klass.fields) {
        // istanbul ignore if
        if (componentReserved.has(field)) {
          throw new Error(
            `Error registering ${klass.name}: Reserved property name "${field}"`
          );
        }
        if (typeof klass.properties[field] === 'function') {
          klass.factories[field] = klass.properties[field];
        } else {
          klass.primitives[field] = klass.properties[field];
        }
      }
    }
    this.entitiesByComponent[name] = new Set();
    this.componentPool.set(name, new ComponentPool(this, name, spinup));
  }

  createEntity(definition) {
    return this.entityPool.get(definition);
  }

  getObject() {
    const obj = [];
    for (const kv of this.entities) {
      obj.push(kv[1].getObject());
    }
    return obj;
  }

  createEntities(definition) {
    for (const entityDef of definition) {
      this.createEntity(entityDef);
    }
  }

  copyTypes(world, types) {
    for (const name of types) {
      if (world.tags.has(name)) {
        this.registerTags(name);
      } else {
        const klass = world.componentTypes[name];
        this.componentTypes[name] = klass;
        this.entitiesByComponent[name] = new Set();
        this.componentPool.set(name, new ComponentPool(this, name, 1));
      }
    }
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
    if (typeof type !== 'string') {
      type = type.name;
    }
    const results = [...this.entitiesByComponent[type]];
    return new Set(results.map((id) => this.getEntity(id)));
  }

  getComponent(id) {
    return this.componentsById.get(id);
  }

  createQuery(init) {
    return new Query(this, null, init);
  }

  _sendChange(operation) {
    if (this.componentTypes[operation.type].subbed) {
      const systems = this.subscriptions.get(operation.type);
      // istanbul ignore if
      if (!systems) {
        return;
      }
      for (const system of systems) {
        system._recvChange(operation);
      }
    }
  }

  registerSystem(group, system, initParams) {
    initParams = initParams || [];
    if (typeof system === 'function') {
      system = new system(this, ...initParams);
    }
    if (!this.systems.has(group)) {
      this.systems.set(group, new Set());
    }
    this.systems.get(group).add(system);
    return system;
  }

  runSystems(group) {
    const systems = this.systems.get(group);
    if (!systems) return;
    for (const system of systems) {
      system._preUpdate();
      system.update(this.currentTick);
      system._postUpdate();
      system.lastTick = this.currentTick;
      if (system.changes.length !== 0) {
        system.changes = [];
      }
    }
  }

  _entityUpdated(entity) {
    // istanbul ignore else
    if (this.config.trackChanges) {
      this.updatedEntities.add(entity);
    }
  }

  _addEntityComponent(name, entity) {
    this.entitiesByComponent[name].add(entity.id);
  }

  _deleteEntityComponent(component) {
    this.entitiesByComponent[component.type].delete(component._meta.entityId);
  }

  _clearIndexes(entity) {
    for (const query of this.queries) {
      query._removeEntity(entity);
    }
    this.updatedEntities.delete(entity);
  }

  updateIndexes() {
    for (const entity of this.updatedEntities) {
      this._updateIndexesEntity(entity);
    }
    this.updatedEntities.clear();
  }

  _updateIndexesEntity(entity) {
    for (const query of this.queries) {
      query.update(entity);
    }
  }
};
