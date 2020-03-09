class QueryCache {

  constructor (ecs, has, hasnt) {

    this.ecs = ecs;
    this.has = has;
    this.hasnt = hasnt;
    this.results = this._initial();
  }

  _initial() {

    if (this.has.length === 1 && this.hasnt.length === 0) {
      const entities = new Set();
      if (this.ecs.components.has(this.has[0])) {
        for (const component of this.ecs.getComponents(this.has[0])) {
          entities.add(component.entity);
        }
      }
      if (this.ecs.entityTags.has(this.has[0])) {
        for (const eid of this.ecs.entityTags.get(this.has[0])) {
          entities.add(this.ecs.getEntity(eid));
        }
      }
      return entities;
    }
    const hasSet = [];
    const hasntSet = [];
    for (const cname of this.has) {
      if (this.ecs.entityComponents.has(cname)) {
        hasSet.push(this.ecs.entityComponents.get(cname));
      }
      if (this.ecs.entityTags.has(cname)) {
        hasSet.push(this.ecs.entityTags.get(cname));
      }
    }
    hasSet.sort((a, b) => {
      return a.size - b.size;
    });
    for (const cname of this.hasnt) {
      if (this.ecs.entityComponents.has(cname)) {
        hasntSet.push(this.ecs.entityComponents.get(cname));
      }
      if (this.ecs.entityTags.has(cname)) {
        hasntSet.push(this.ecs.entityTags.get(cname));
      }
    }

    const results = new Set([...hasSet[0]]);
    for (let idx = 1, l = hasSet.length; idx < l; idx++) {
      const intersect = hasSet[idx];
      for (const id of results) {
        if (!intersect.has(id)) {
          results.delete(id);
        }
      }
    }
    for (const id of results) {
      for (const diff of hasntSet) {
        if (diff.has(id)) {
          results.delete(id);
          break;
        }
      }
    }

    return new Set([...results]
      .map(id => this.ecs.entities.get(id))
      .filter(entity => !!entity)
    );
  }

  updateEntity(entity) {

    const id = entity.id;
    let found = true;
    for (const cname of this.has) {
      if (this.ecs.entityComponents.has(cname)) {
        const hasSet = this.ecs.entityComponents.get(cname);
        if (!hasSet.has(id)) {
          found = false;
          break;
        }
      }
      if (this.ecs.entityTags.has(cname)) {
        const hasTag = this.ecs.entityTags.get(cname);
        if (!hasTag.has(id)) {
          found = false;
          break;
        }
      }
    }

    if (!found) {
      this.results.delete(entity);
      return;
    }

    found = false;
    for (const cname of this.hasnt) {
      if (this.ecs.entityComponents.has(cname)) {
        const hasntSet = this.ecs.entityComponents.get(cname);
        if (hasntSet.has(id)) {
          found = true;
          break;
        }
      }
      if (this.ecs.entityTags.has(cname)) {
        const hasntSet = this.ecs.entityTags.get(cname);
        if (hasntSet.has(id)) {
          found = true;
          break;
        }
      }
    }
    if (found) {
      this.results.delete(entity);
      return;
    }
    this.results.add(entity);
  }

  clearEntity(entity) {

    this.results.delete(entity);
  }

  filter(updatedValues, updatedComponents) {

    let output;
    if (updatedValues > 0) {
      output = [];
      for (const entity of this.results) {
        if (entity.updatedValues >= updatedValues) output.push(entity);
      }
    } else if (updatedComponents > 0) {
      output = [];
      for (const entity of this.results) {
        if (entity.updatedComponents >= updatedComponents) output.push(entity);
      }
    } else {
      return this.results;
    }

    return new Set(output);
  }
}

module.exports = QueryCache;
