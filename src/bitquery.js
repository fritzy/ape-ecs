const defaultQuery = {
  from: 'all', //set, reverse
  fromSet: undefined,
  reverseEntity: undefined,
  reverseComponent: undefined,
  all: undefined,
  any: undefined,
  not: undefined,
  trackAdded: false,
  trackRemoved: false,
  onAdded: undefined,
  onRemoved: undefined,
  system: undefined,
  includeApeDestroy: false
};

class BitQuery {

  constructor(world, query) {

    this.world = world;
    this.registry = world.registry;
    this.results = new Set();
    this.query = {...defaultQuery, ...query};
    this.system = this.query.system;
    this.allMask = 0n;
    this.notMask = 0n;
    this.anyMask = 0n;
    this.added = new Set();
    this.removed = new Set();

    if (this.world.config.useApeDestroy && !this.query.includeApeDestroy) {
      if (Array.isArray(this.query.not)) {
        this.query.not.push('ApeDestroy');
      } else {
        this.query.not = [];
      }
    }
    if (this.system) {
      this.system.queries.push(this);
    }

    this._setMasks();
  }

  clear() {
    this.clearChanges();
    this.results.clear();
  }

  clearChanges() {
    if (this.added) {
      this.added.clear();
    }
    if (this.removed) {
      this.removed.clear();
    }
  }

  from(entities) {

    this.query.from = 'set';
    this.query.fromSet = entities.map(e => 
      typeof e === 'string' ? this.world.entities.get(e) : e
    )
    return this;
  }

  fromReverse(entity, type) {

    if (typeof type !== 'string')
      type = type.name;
    if (typeof entity !== 'string')
      entity = entity.id;
    this.query.from = 'reverse'
    this.query.reverseEntity = entity;
    this.query.reverseComponent = type;
    return this;
  }


  _makeMask(compArray) {

    return [0n, ... compArray.map((comp) => {
      if (typeof comp !== 'string') {
        comp = comp.name;
      }
      if(!this.registry.typeset.has(comp))
        throw new Error(`Component/Tag not defined: ${comp}`);
      return this.registry.typenum.get(comp);
    })].reduce((mask, digit) => mask |= 1n << digit);
  }

  _setMasks() {

    if (this.query.all) {
      // sort all components by number of entities so that we can start with the smallest set
      this.query.all = this.query.all.map(comp => typeof comp === 'string' ? comp : comp.name)
        .sort((a, b) => ((this.world.entitiesByComponent[a] || new Set()).size
          - (this.world.entitiesByComponent[b] || new Set()).size))
      this.allMask = this._makeMask(this.query.all);
    }
    if (this.query.any) {
      this.anyMask = this._makeMask(this.query.any);
    }
    if (this.query.not) {
      this.notMask = this._makeMask(this.query.not);
    }
  }

  run() {

    let from;
    if (this.query.from === 'reverse') {
      const entity = this.query.reverseEntity;
      const type = this.query.reverseComponent;
      if (this.world.entityReverse[entity]
      && this.world.entityReverse[entity][type] instanceof Map) {
        from = [...this.world.entityReverse[entity][type].keys()]
          .map(id => this.world.entities.get(id))
      } else {
        from = [];
      }
    } else if (this.query.from === 'set') {
      from = this.query.fromSet;
    } else {
      if (this.allMask) {
        // use the smallest set of entities possible as the starting point
        from = [...this.world.entitiesByComponent[this.query.all[0]] || []].map(id => this.world.getEntity(id));
      } else {
        from = this.world.entities.values();
      }
    }
    if (!(from instanceof Set)) {
      from = new Set(from);
    }
    for (const entity of from) {
      let found = true;
      if (this.allMask && (entity.bitmask & this.allMask) !== this.allMask) {
        found = false;
      }
      if (this.anyMask && (entity.bitmask & this.anyMask) === 0n) {
        found = false;
      }
      if (this.notMask && found 
        && (entity.bitmask & this.notMask) !== 0n) {
        found = false;
      }
      if (found) {
        if (!this.results.has(entity)) {
          this.results.add(entity);
          if (this.query.trackAdded) {
            this.added.add(entity);
          }
        }
      } else {
        if (this.results.has(entity)) {
          this.results.delete(entity);
          if (this.query.trackRemoved) {
            this.removed.add(entity);
          }
        }
      }
    }
    for (const entity of this.results) {
      if (entity.destroyed || !from.has(entity)) {
        this.results.delete(entity);
        if (this.query.trackRemoved) {
          this.removed.add(entity);
        }
      }
    }
    return this.results;
  }

  filter(filter) {
    this.run();
    return new Set([... this.results].filter(filter));
  }

  onAdd(cb) {

    this.query.onAdded = cb;
  }

  onRemove(cb) {

    this.query.onRemoved = cb;
  }

}

module.exports = BitQuery;
