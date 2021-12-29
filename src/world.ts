
import Entity from './entity.js';
import EntityPool from './entitypool.js';
import { Component } from './component';
import { System } from './system';
import Query from './query.js';
import setupApeDestroy from './cleanup';
import { singletonRepo, ComponentRegistry } from './componentregistry.js';

export interface IWorldConfig {
  entityPool?: number;
  cleanupPools?: boolean;
  useApeDestroy?: boolean;
  newRegistry?: boolean;
  registry?: object;
}

export class World {

  config: IWorldConfig;
  entitiesByComponent: {[index: string] : Set<Entity>};
  registry: any;
  entities: Map<string, Entity>;
  currentTick: number;
  types: {[key: string]: typeof Component};
  componentsById: Map<string, Component>;
  updatedEntities: Set<Entity>;
  queries: Query[];
  systems: Map<string, Set<System>>;
  entityPool: EntityPool;

  constructor(config?: IWorldConfig) {
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
    this.queries = [];
    this.systems = new Map();
    this.entityPool = new EntityPool(this, this.config.entityPool);
    if (this.config.useApeDestroy) {
      setupApeDestroy(this);
    }
  }

  tick(): number {
    if (this.config.useApeDestroy) {
      this.runSystems('ApeCleanup');
    }
    this.currentTick++;
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

  registerTags(...tags: string[]) {
    this.registry.registerTags(...tags);
  }

  registerComponent(klass: any, spinup: number = 1) {
    this.registry.registerComponent(klass, spinup);
  }

  createEntity(definition?: object): Entity {
    definition = definition || {};
    return this.entityPool.get(definition);
  }

  getObject(): object {
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

  getEntity(entityId: string): Entity {
    return this.entities.get(entityId);
  }

  getEntities(type: string | any): Entity[] {
    if (typeof type !== 'string') {
      type = type.name;
    }
    return [...this.entitiesByComponent[type]];
  }

  getComponent(id: string): any {
    return this.componentsById.get(id);
  }

  createQuery(query?: object): Query {
    return new Query(this, query);
  }

  registerSystem(group: string, system: any, initParams?: object): any {
    initParams = initParams || {};
    if (typeof system === 'function') {
      system = new system(this, initParams);
    }
    if (!this.systems.has(group)) {
      this.systems.set(group, new Set());
    }
    this.systems.get(group).add(system);
    return system;
  }

  runSystems(group: string) {
    const systems = this.systems.get(group);
    if (!systems) throw new Error(`No system group ${group}`);
    for (const system of systems) {
      system._preUpdate();
      system.update(this.currentTick);
      system._postUpdate();
      system.lastTick = this.currentTick;
    }
  }

  _entityUpdated(entity: Entity) {
    this.updatedEntities.add(entity);
  }

  _addEntityComponent(name: string, entity: Entity) {
    this.entitiesByComponent[name].add(entity);
  }

  _deleteEntityComponent(component: Component) {
    this.entitiesByComponent[component.type].delete(component.entity);
  }

  _clearIndexes(entity: Entity) {
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

  _updateIndexesEntity(entity: Entity) {
    for (const query of this.queries) {
      query.updateEntity(entity);
    }
  }
};
