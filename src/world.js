/*
 * @module ecs/ECS
 * @type {class}
 */
const Entity = require('./entity');
const BitQuery = require('./bitquery');
const ComponentPool = require('./componentpool');
const EntityPool = require('./entitypool');
const setupApeDestroy = require('./cleanup');
const { singletonRepo, ComponentRegistry } = require('./componentregistry');

module.exports = class World {
  constructor(config) {
    this.config = Object.assign(
      {
        trackChanges: true,
        entityPool: 10,
        cleanupPools: true,
        useApeDestroy: false,
        newRegistry: false,
        registry: null
      },
      config
    );
    if (this.config.registry !== null) {
      this.registry = this.config.registry;
    } else if (this.config.newRegistry) {
      this.registry = new ComponentRegistry();
    } else {
      this.registry = singletonRepo;
    }
    this.registry.addWorld(this);
    /*
    this.componentTypes = {};
    this.componentPool = new Map();
    this.tags = new Set();
    */
    this.entitiesByComponent = {};
    this.currentTick = 0;
    this.entities = new Map();
    this.types = {};
    this.componentsById = new Map();
    this.entityReverse = {};
    this.updatedEntities = new Set();
    this.components = new Map();
    this.queries = [];
    this.subscriptions = new Map();
    this.systems = new Map();
    this.refs = {};
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
      for (const [key, pool] of this.registry.pool) {
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
    for (const [key, pool] of this.registry.pool) {
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

  registerTags(...tags) {
    this.registry.registerTags(...tags);
  }

  registerComponent(klass, spinup = 1) {
    this.registry.registerComponent(klass, spinup);
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

  createQuery(query) {
    return new BitQuery(this, query);
  }

  _sendChange(operation) {
    if (this.registry.types[operation.type].subbed) {
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
    if (!this.entitiesByComponent.hasOwnProperty(name)) {
      this.entitiesByComponent[name] = new Set();
    }
    this.entitiesByComponent[name].add(entity.id);
  }

  _deleteEntityComponent(component) {
    this.entitiesByComponent[component.type].delete(component.entity.id);
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
