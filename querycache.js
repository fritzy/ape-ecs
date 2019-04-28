class QueryCache {

  constructor (ecs, has, hasnt) {

    this.ecs = ecs;
    this.has = has;
    this.hasnt = hasnt;
    this.results = this._initial();
  }

  _initial() {

    const hasSet = [];
    const hasntSet = [];
    for (const cname of this.has) {
      hasSet.push(this.ecs.entityComponents.get(cname));
    }
    hasSet.sort((a, b) => {
      return a.size - b.size;
    });
    for (const cname of this.hasnt) {
      hasntSet.push(this.ecs.entityComponents.get(cname));
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
      const hasSet = this.ecs.entityComponents.get(cname);
      if (!hasSet.has(id)) {
        found = false;
        break;
      }
    }
    if (!found) {
      this.results.delete(entity);
      return;
    }

    found = false;
    for (const cname of this.hasnt) {
      const hasntSet = this.ecs.entityComponents.get(cname);
      if (hasntSet.has(id)) {
        found = true;
        break;
      }
    }
    if (found) {
      this.results.delete(entity);
      return;
    }
    this.results.add(entity);
  }

  query(lastUpdated, lastComponentUpdated) {

    const output = [...this.results];
    if (lastUpdated > 0) {
      output.filter(entity => entity.lastUpdated < lastUpdated);
    }
    if (lastComponentUpdated > 0) {
      output.filter(entity => entity.lastComponentUpdated < lastComponentUpdated);
    }

    return output;
  }
}

module.exports = QueryCache;
