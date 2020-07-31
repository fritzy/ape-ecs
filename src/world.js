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

const componentReserved = new Set(
  [
    'clone',
    '_meta',
    '_setup',
    '_updated',
    '_reset',
    'getObject',
    '_addRef',
    '_deleteRef',
    'lookup',
    'destroy'
  ]);
const entityReserved = new Set([
    'prototype',
    'this',
    'c',
    'types',
    'id',
    'tags',
    'updatedComponents',
    'updatedValues'
  ]);

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
      entityPool: 10
    }, config);
    this.currentTick = 0;
    this.entities = new Map();
    this.types = {};
    this.typeDefs = new Map();
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
    this.entityPool = new EntityPool(this, this.config.entityPool);
  }

  /**
   * Called in order to increment ecs.currentTick, update indexed queries, and update lookups.
   * @method module:ECS#tick
   */
  tick() {

    this.currentTick++;
    this.updateIndexes();
    return this.currentTick;
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
    // istanbul ignore else
    if (count < 1) {
      ref.delete(entity);
    } else {
      ref.set(entity, count);
    }
    if (ref.size === 0) {
      delete ref[lookup];
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
        // istanbul ignore if
        if (this.entitiesByComponent.hasOwnProperty(tag)) {
          throw new Error (`Cannot register tag "${tag}", name is already taken.`);
        }
        this.entitiesByComponent[tag] = new Set();
        this.typeDefs.set(tag, { tag: true });
      }
      return;
    }
    this.entitiesByComponent[tags] = new Set();
    this.typeDefs.set(tags, { tag: true });
  }

  registerComponent(name, definition, spinup=1) {

    // istanbul ignore if
    if (this.entitiesByComponent.hasOwnProperty(name)) {
      throw new Error (`Cannot register component "${name}", name is already taken.`);
    }
    this.typeDefs.set(name, definition);
    if (definition.tag) {
      return this.registerTags(name);
    }
    // $lab:coverage:on$
    if (!definition.properties) definition.properties = {};

    const klass = class CustomComponent extends Component {};

    const props = definition.properties;
    const primitive = {};
    const special = {};
    const fields = Object.keys(definition.properties);
    definition.writeHooks = definition.writeHooks || [];
    for (const field of fields) {
      // istanbul ignore if
      if (componentReserved.has(field)) {
        throw new Error(`Cannot use the reserved field name "${field}"`);
      }
      if (typeof props[field] === 'function') {
        special[field] = props[field];
        continue;
      }
      primitive[field] = props[field];
      if (definition.writeHooks.length > 0) {
        Object.defineProperty(klass.prototype, field, {
          enumerable: true,
          get() {
            return this._meta.values[field];
          },
          set(value) {
            for (const hook of this.writeHooks) {
              value = hook(this, field, value);
            }
            this._meta.values[field] = value;
            this._meta.updated = this.world.currentTick;
            return true;
          }
        });
      } else {
        Object.defineProperty(klass.prototype, field, {
          enumerable: true,
          get() {
            return this._meta.values[field];
          },
          set(value) {
            this._meta.values[field] = value;
            this._meta.updated = this.world.currentTick;
            return true;
          }
        });
      }
    }

    klass.prototype.onInit = definition.init || function onInit() {};
    klass.prototype.onDestroy = definition.destroy || function onDestroy() {};
    klass.prototype.type = name;
    klass.prototype.writeHooks = definition.writeHooks;
    Object.defineProperty(klass.prototype, 'world', {
      value: this, enumerable: false });
    klass.serialize = {};
    definition.serialize = definition.serialize || {};
    klass.serialize.skip = definition.serialize.skip || false;
    klass.serialize.ignore = definition.serialize.ignore || [];
    klass.props = {
      fields,
      primitive,
      special
    };
    Object.defineProperty(klass.prototype, 'lookup',  {
      enumerable: true,
      get() {
        return this._meta.lookup
      },
      set(value) {
        // istanbul ignore next
        if (entityReserved.has(value)) {
          // istanbul ignore next
          throw new Error(`Cannot have component lookup of reserved word ${value}`);
        }
        const old = this._meta.lookup;
        this._meta.lookup = value;
        if (old) {
          delete this.entity[old];
        }
        if (value) {
          this.entity[value] = this;
        }
      }
    });
    klass.subbed = false;
    Object.defineProperty(klass, 'name', { value: name });
    this.componentTypes[name] = klass;
    this.entitiesByComponent[name] = new Set();
    this.componentPool.set(name, new ComponentPool(this, name, spinup));
  }

  createEntity(definition) {

    return this.entityPool.get(definition);
  }

  createEntityComponents(definition) {

    const components = [];
    let tags;
    for (const key of Object.keys(definition)) {
      if (key === 'tags') {
        tags = definition.tags;
        continue;
      }
      const def = {
        ...definition[key],
        lookup: key
      };
      if (!def.type) {
        def.type = key
      }
      components.push(def);
    }
    return this.entityPool.get({
      components,
      tags
    });
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
      this.registerComponent(name, world.typeDefs.get(name));
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

    const results = [...this.entitiesByComponent[type]];
    return new Set(results.map((id) => this.getEntity(id)));
  }

  getComponent(id) {

    return this.componentsById.get(id);
  }

  createQuery(init) {

    return new Query(this, null, init);
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

  registerSystem(group, system) {

    if (typeof system === 'function') {
      system = new system(this);
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

    for (const query of this.queries) {
      query.update(entity);
    }
  }

}
