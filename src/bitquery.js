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
    this.persisted = !!this.system;
    this.ran = false;
    this.allMask = 0n;
    this.notMask = 0n;
    this.anyMask = 0n;
    this.added = new Set();
    this.removed = new Set();

    if (this.query.all) {
      this.query.all = this.query.all.map(type =>
        typeof type === 'string' ? type : type.name);
    }
    if (this.query.not) {
      this.query.not = this.query.not.map(type =>
        typeof type === 'string' ? type : type.name);
    }
    if (this.query.any) {
      this.query.any = query.any.map(type =>
        typeof type === 'string' ? type : type.name);
    }
    if (this.query.fromSet){
      this.from(this.query.fromSet);
    }

    if (this.world.config.useApeDestroy && !this.query.includeApeDestroy) {
      if (Array.isArray(this.query.not)) {
        this.query.not.push('ApeDestroy');
      } else {
        this.query.not = ['ApeDestroy'];
      }
    }
    if (this.system) {
      this.system.queries.push(this);
      this.world.queries.push(this);
    }


    this._setMasks();
  }

  clear() {
    this.clearChanges();
    this.results.clear();
  }

  clearChanges() {
    if (this.query.trackAdded) {
      this.added.clear();
    }
    if (this.query.trackRemoved) {
      this.removed.clear();
    }
  }

  _removeEntity(entity) {
    if (this.results.has(entity)) {
      this.results.delete(entity);
      if (this.query.trackRemoved) {
        this.removed.add(entity);
      }
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
      const digit = this.registry.typenum.get(comp);
      if (typeof digit !== 'bigint') {
        throw new Error(`Unregistered type: ${comp}`);
      }
      return digit;
    })].reduce((mask, digit) => mask |= 1n << digit);
  }

  _setMasks() {
    if (this.query.all) {
      this.allMask = this._makeMask(this.query.all);
    }
    if (this.query.any) {
      this.anyMask = this._makeMask(this.query.any);
    }
    if (this.query.not) {
      this.notMask = this._makeMask(this.query.not);
    }
  }

  updateEntity(entity) {
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
      this._removeEntity(entity);
    }
  }

  run() {
    if (!this.persisted || !this.ran) {
      if (this.ran)
        this.results.clear();
      return this.refresh();
    }
    return this.results;
  }

  refresh() {
    let from;
    this.ran = true;
    if (this.query.from === 'reverse') {
      const entity = this.world.getEntity(this.query.reverseEntity);
      const type = this.query.reverseComponent;

      if (entity) {
        from = [...entity.links]
          .filter(component => type === undefined || component.type === type)
          .map(component => component.entity)
      } else {
        from = [];
      }
    } else if (this.query.from === 'set') {
      from = this.query.fromSet;
    } else {
      if (this.allMask) {
        // use the smallest set of entities possible as the starting point
        let smallCount = Infinity;
        for (const type of this.query.all) {
          const cset = this.world.entitiesByComponent[type];
          /* istanbul ignore else */
          if (cset && cset.size < smallCount){
            smallCount = cset.size;
            from = cset;
          }
        }
        /* istanbul ignore next */
        if (!from) from = [];
      } else {
        from = this.world.entities.values();
      }
    }
    if (!(from instanceof Set)) {
      from = new Set(from);
    }
    for (const entity of from) {
      this.updateEntity(entity);
    }
    return this.results;
  }

  filter(filter) {
    return new Set([...this.run()].filter(filter));
  }

}

module.exports = BitQuery;
