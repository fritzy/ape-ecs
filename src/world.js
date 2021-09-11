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
        entityPool: 10,
        cleanupPools: true,
        useApeDestroy: true,
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
    this.entitiesByComponent = {};
    this.registry.addWorld(this);
    this.currentTick = 0;
    this.entities = new Map();
    this.types = {};
    this.componentsById = new Map();
    this.updatedEntities = new Set();
    this.components = new Map();
    this.queries = [];
    this.systems = new Map();
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
    //this.updateIndexes();
    this.entityPool.release();
    // istanbul ignore else
    if (this.config.cleanupPools) {
      this.entityPool.cleanup();
      for (const [key, pool] of this.registry.pool) {
        pool.cleanup();
      }
    }
    return this.currentTick;
  }

  registerTags(...tags) {
    this.registry.registerTags(...tags);
  }

  registerComponent(klass, spinup = 1) {
    this.registry.registerComponent(klass, spinup);
  }

  createEntity(definition) {
    definition = definition || {};
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

  getEntity(entityId) {
    return this.entities.get(entityId);
  }

  getEntities(type) {
    if (typeof type !== 'string') {
      type = type.name;
    }
    return [...this.entitiesByComponent[type]];
  }

  getComponent(id) {
    return this.componentsById.get(id);
  }

  createQuery(query) {
    return new BitQuery(this, query);
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
    }
  }

  _entityUpdated(entity) {
    this.updatedEntities.add(entity);
  }

  _addEntityComponent(name, entity) {
    this.entitiesByComponent[name].add(entity);
  }

  _deleteEntityComponent(component) {
    this.entitiesByComponent[component.type].delete(component.entity);
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
      query.updateEntity(entity);
    }
  }
};
