const SetHelpers = require('set-helpers');
const Entity = require('./entity');


//from(entities).fromReverse(entity, components).fromAll(types).fromAny(types).not(types).filter((entity) => true).index('myindex').execute(last).update(entity);

class Query {

  constructor(ecs, init) {

    this.ecs = ecs;
    this.query = {
      froms: [],
      filters: []
    };
    this.hasStatic = false;
    this.indexed = false;
    this.results = new Set();
    this.executed = false;
    if (init) {
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
      if (init.filter) {
        this.filter(init.filter);
      }
    }
  }

  from(entities) {

    if (!(entities instanceof Set)) {
      entities = new Set(entities);
    }
    this.query.froms.push({
      from: 'from',
      entities
    });
    this.hasStatic = true;
    return this;
  }

  fromReverse(entity, componentName) {

    if(typeof entity !== 'object') {
      entity = this.ecs.getEntity(entity);
    }
    this.query.froms.push({
      from: 'reverse',
      entity,
      type: componentName
    });
    return this;
  }

  fromAll(types) {

    this.query.froms.push({
      from: 'all',
      types
    });
    return this;
  }

  fromAny(any) {

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

  filter(func) {

    this.query.filters.push({
      filter: 'func',
      func
    });
    return this;
  }

  update(entity) {

    let inFrom = false;
    this.results.delete(entity);
    if (entity.destroy) return;
    for (const source of this.query.froms) {
      if(source.from === 'all') {
        const potential = [];
        for (const type of source.types) {
          potential.push(this.ecs.entityComponents.get(type));
        }
        potential.sort((a, b) => a.size - b.size);
        let found = true;
        for (const entities of potential) {
          if (!entities.has(entity)) {
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
          potential.push(this.ecs.entityComponents.get(type));
        }
        potential.sort((a, b) => b.size - a.size);
        let found = false;
        for (const entities of potential) {
          if (entities.has(entity)) {
            found = true;
            break;
          }
        }
        if (found) {
          inFrom = true;
          break;
        }
      }
    }
    if (inFrom) {
      this.results.add(entity);
      this._filter(entity);
    }
  }

  index(name) {

    if (this.hasStatic) {
      throw new Error('Cannot persistently index query with static list of entities.');
    }
    if (this.query.froms.length === 0) {
      throw new Error('Cannot persistently index query without entity source (fromAll, fromAny, fromReverse).');
    }
    this.ecs.queryIndexes.set(name, this);
    this.indexed = true;
    return this;
  }

  refresh() {

    //load in entities using from methods
    this.results = new Set();
    for (const source of this.query.froms) {
      if (source.from === 'from') {
        this.results = SetHelpers.union(this.results, source.entities);
      } else if (source.from === 'all') {
        const comps = [];
        for (const type of source.types) {
          const entities = this.ecs.entityComponents.get(type);
          if (entities === undefined) {
            throw new Error(`${type} is not a registered Component/Tag`);
          }
          comps.push(entities);
        }
        this.results = SetHelpers.union(this.results, SetHelpers.intersection(...comps));
      } else if (source.from === 'any') {
        const comps = [];
        for (const type of source.types) {
          const entities = this.ecs.entityComponents.get(type);
          if (entities === undefined) {
            throw new Error(`${type} is not a registered Component/Tag`);
          }
          comps.push(entities);
        }
        this.results = SetHelpers.union(this.results, ...comps);
      } else if (source.from === 'reverse') {
        const entity = this.ecs.getEntity(source.entity);
        if (entity.refs.hasOwnProperty(type)) {
          this.results = SetHelpers.union(this.results, entity.refs[type]);
        }
      }
    }

    //filter results
    for (const entity of this.results) {
      this._filter(entity);
    }
    return this;
  }

  _filter(entity) {

    for (const filter of this.query.filters) {
      if (filter.filter === 'not') {
        for (const type of filter.types) {
          if (entity.has(type)) {
            this.results.delete(entity);
            break;
          }
        }
      } else if (filter.filter === 'func') {
        if(!filter.func.apply(this.ecs, [entity])) {
          this.results.delete(entity);
        }
      }
    }
  }

  execute(filter) {

    if (!this.executed) {
      this.refresh();
    }
    this.executed = true;
    if (filter === undefined) {
      return this.results;
    }
    const output = [];
    for (const entity of this.results) {
      if (
        !(filter.updatedComponents && entity.updatedComponents < entity.updatedComponents)
        && !(filter.updatedValues && entity.updatedValues < entity.updatedValues)
      ) {
        output.push(entity)
      }
    }
    return new Set(output);
  }

}

module.exports = Query;
