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

  getEntity(entityId) {

    return this.entities.get(entityId);
  }

  queryEntities(args) {

    if (typeof args === 'string') {
      args = {
        cache: args
      };
    }
    const { has, hasnt, cache, lastUpdated, lastComponentUpdated } = Object.assign({
      has: [],
      hasnt: [],
      cache: false,
      lastUpdated: 0,
      lastComponentUpdated: 0
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
    return query.query(lastUpdated, lastComponentUpdated);
  }

  getComponents(name) {

    return [...this.components.get(name)];
  }

  _updateCache(entity) {
    for (const query of this.queryCache) {
      query[1].updateEntity(entity);
    }
  }

}

module.exports = ECS;

/*
const ecs = new ECS();
ecs.registerComponent('Health', {
  properties: {
    max: 25,
    hp: 25,
    armor: 0
  }
});

ecs.registerComponent('Storage', {
  properties: {
    name: 'Inventory',
    size: 10,
    inventory: '<EntityArray>'
  },
  multiset: true
});

const entity = ecs.createEntity({
  components: {
    Health: [{ hp: 10 }],
    Storage: [{ size: 20 }],
  }
});

const entity2 = ecs.createEntity({
  components: {
    Health: [{ hp: 10 }],
  }
});

console.log(entity);
console.log(ecs.queryEntities({has: ['Health']}).length);
const withstorage = ecs.queryEntities({has: ['Health', 'Storage']});
console.log('withstorage', withstorage.length);
const nostorage = ecs.queryEntities({has: ['Health'], hasnt: ['Storage'], cache: 'nostorage'});
console.log('nostorage', nostorage.length);
console.log('.....');
const nostorage2 = ecs.queryEntities('nostorage');
console.log('nostorage cache', nostorage2.length);
entity.clearComponents('Storage');
const nostorage3 = ecs.queryEntities('nostorage');
console.log('nostorage cache2', nostorage3.length);
const withstorage2 = ecs.queryEntities({has: ['Health', 'Storage']});
console.log('withstorage2', withstorage2.length);
*/
