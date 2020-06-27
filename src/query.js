const Entity = require('./entity');
const Util = require('./util');

class Query {

  constructor(world, init) {

    this.world = world;
    this.query = {
      froms: [],
      filters: []
    };

    this.hasStatic = false;
    this.indexed = false;
    this.results = new Set();
    this.executed = false;
    this.added = new Set();
    this.removed = new Set();

    if (init) {
      this.trackAdded = init.trackAdded || false;
      this.trackRemoved = init.trackRemoved || false;
      if (init.from) {
        this.from(init.from);
      }
      if (init.reverse) {
        this.fromReverse(init.reverse.entity, init.reverse.type);
      }
      if (init.all) {
        this.fromAll(init.all);
      }
      if (init.any) {
        this.fromAny(init.any);
      }
      if (init.not) {
        this.not(init.not);
      }
      if (init.index) {
        this.index(init.index);
      }
    }
  }

  from(entities) {

    /* $lab:coverage:off$ */
    entities = entities.map((e) => (typeof e !== 'string') ? e.id : e);
    /* $lab:coverage:on$ */
    this.query.froms.push({
      from: 'from',
      entities
    });
    this.hasStatic = true;
    return this;
  }

  fromReverse(entity, componentName) {

    /* $lab:coverage:off$ */
    if(typeof entity !== 'object') {
      entity = this.world.getEntity(entity);
    }
    /* $lab:coverage:on$ */
    this.query.froms.push({
      from: 'reverse',
      entity,
      type: componentName
    });
    return this;
  }

  fromAll(types) {

    if (typeof types === 'string') types = [types];
    this.query.froms.push({
      from: 'all',
      types
    });
    return this;
  }

  fromAny(types) {

    this.query.froms.push({
      from: 'any',
      types
    });
    return this;
  }

  not(types) {

    this.query.filters.push({
      filter: 'not',
      types
    });
    return this;
  }

  update(entity) {

    let inFrom = false;
    this.results.delete(entity);
    for (const source of this.query.froms) {
      if (source.from === 'all') {
        const potential = [];
        for (const type of source.types) {
          potential.push(this.world.entitiesByComponent[type]);
        }
        potential.sort((a, b) => a.size - b.size);
        let found = true;
        for (const entities of potential) {
          if (!entities.has(entity.id)) {
            found = false;
            break;
          }
        }
        if (found) {
          inFrom = true;
          break;
        }
      } else if (source.from === 'any') {
        const potential = [];
        for (const type of source.types) {
          potential.push(this.world.entitiesByComponent[type]);
        }
        potential.sort((a, b) => b.size - a.size);
        let found = false;
        for (const entities of potential) {
          if (entities.has(entity.id)) {
            found = true;
            break;
          }
        }
        if (found) {
          inFrom = true;
          break;
        }
      // $lab:coverage:off$
      } else if (source.from === 'reverse') {
        if (this.world.entityReverse.hasOwnProperty(source.entity.id)
          && this.world.entityReverse[source.entity.id].hasOwnProperty(source.type)) {
      // $lab:coverage:on$
          const keys = new Set(this.world.entityReverse[source.entity.id][source.type].keys());
          if (new Set(this.world.entityReverse[source.entity.id][source.type].keys()).has(entity.id)) {
            inFrom = true;
            break;
          }
        }
      }
    }
    if (inFrom) {
      this.results.add(entity);
      this._filter(entity);
      if (this.trackAdded) {
        this.added.add(entity);
      }
    } else if (this.trackRemoved) {
      this.removed.add(entity);
    }
  }

  index(name) {

    /* $lab:coverage:off$ */
    if (this.hasStatic) {
      throw new Error('Cannot persistently index query with static list of entities.');
    }
    if (this.query.froms.length === 0) {
      throw new Error('Cannot persistently index query without entity source (fromAll, fromAny, fromReverse).');
    }
    /* $lab:coverage:on$ */
    this.world.queryIndexes.set(name, this);
    this.indexed = true;
    return this;
  }

  refresh() {

    //load in entities using from methods
    let results = new Set();
    for (const source of this.query.froms) {
      if (source.from === 'from') {
        results = Util.setUnion(results, source.entities);
      } else if (source.from === 'all') {
        if (source.types.length === 1) {
          /* $lab:coverage:off$ */
          if (!this.world.entitiesByComponent.hasOwnProperty(source.types[0])) {
            throw new Error(`${source.types[0]} is not a registered Component/Tag`);
          }
          /* $lab:coverage:on$ */
          results = Util.setUnion(results, this.world.entitiesByComponent[source.types[0]]);
        } else {
          const comps = [];
          for (const type of source.types) {
            const entities = this.world.entitiesByComponent[type];
            /* $lab:coverage:off$ */
            if (entities === undefined) {
              throw new Error(`${type} is not a registered Component/Tag`);
            }
            /* $lab:coverage:on$ */
            comps.push(entities);
          }
          results = Util.setUnion(results, Util.setIntersection(...comps));
        }
      } else if (source.from === 'any') {
        const comps = [];
        for (const type of source.types) {
          const entities = this.world.entitiesByComponent[type];
          /* $lab:coverage:off$ */
          if (entities === undefined) {
            throw new Error(`${type} is not a registered Component/Tag`);
          }
          /* $lab:coverage:on$ */
          comps.push(entities);
        }
        results = Util.setUnion(results, ...comps);
      // $lab:coverage:off$
      } else if (source.from === 'reverse') {
        if (this.world.entityReverse[source.entity.id]
          && this.world.entityReverse[source.entity.id].hasOwnProperty(source.type)) {
      // $lab:coverage:on$
          results = Util.setUnion(results, new Set([...this.world.entityReverse[source.entity.id][source.type].keys()]));
        }
      }
    }

    this.results = new Set([...results]
      .map(id => this.world.getEntity(id))
      .filter(entity => !!entity)
    );


    //filter results
    for (const entity of this.results) {
      this._filter(entity);
    }
    return this;
  }

  _filter(entity) {

    for (const filter of this.query.filters) {
      /* $lab:coverage:off$ */
      if (filter.filter === 'not') {
      /* $lab:coverage:on$ */
        for (const type of filter.types) {
          if (entity.has(type)) {
            this.results.delete(entity);
            break;
          }
        }
      }
    }
  }

  execute(filter) {

    if (!this.executed) {
      this.refresh();
    }
    this.added.clear();
    this.removed.clear();
    this.executed = true;
    if (filter === undefined) {
      return this.results;
    }
    const output = [];
    for (const entity of this.results) {
      if (
        !(filter.updatedComponents && entity.updatedComponents < filter.updatedComponents)
        && !(filter.updatedValues && entity.updatedValues < filter.updatedValues)
      ) {
        output.push(entity)
      }
    }
    return new Set(output);
  }

}

module.exports = Query;
