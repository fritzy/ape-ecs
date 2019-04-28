const BaseComponent = require('./component');

let ids = 0;

class Entity {

  constructor(ecs, definition = { components: {} }) {

    Object.defineProperty(this, 'ecs', { enumerable: false, value: ecs });
    if (!definition.entity) {
      this.id = ids++;
    } else {
      this.id = definition.entity;
    }
    this.components = {}

    this.lastUpdate = this.ecs.ticks;
    this.lastComponentUpdate = this.ecs.ticks;

    for (const type of Object.keys(definition.components)) {
      const cdefs = definition.components[type];
      if (Array.isArray(cdefs)) {
        for (const def of cdefs) {
          this.addComponent(def, type, true);
        }
      } else {
        this.addComponent(cdefs, type, true);
      }
    }
    this.ecs.entities.set(this.id, this);
    this.ecs._updateCache(this);
  }

  addComponent(definition, type, delayCache) {

    const ecs = this.ecs;
    const name = definition.type || type;
    const component = new ecs.types[name](ecs, this, definition);

    if (ecs.types[name].definition.multiset) {
      if(!this.components.hasOwnProperty(component.type)) {
        this.components[component.type] = new Set([component]);
      } else {
        this.components[component.type].add(component);
      }
    } else {
      if(this.components.hasOwnProperty(component.type)) {
        throw new Error(`Entity<${this.id}> already has component ${component.type}`)
      }
      this.components[component.type] = component;
    }

    ecs.entityComponents.get(component.type).add(this.id);
    ecs.components.get(component.type).add(component);


    this.lastUpdate = this.ecs.ticks;
    if (!delayCache) {
      this.ecs._updateCache(this);
    }

    return component;
  }

  clearComponents(cname) {

    if (!this.components.hasOwnProperty(cname)) {
      return;
    }

    if (this.ecs.types[cname].definition.multiset) {
      for (const component of this.components[cname]) {
        this.removeComponent(component, true);
      }
      this.ecs._updateCache(this);
    } else {
      this.removeComponent(this.components[cname]);
    }
  }

  removeComponent(component, delayCache) {

    const ecs = this.ecs;
    const name = component.type;
    if (ecs.types[name].definition.multiset) {
      if (this.components.hasOwnProperty(component.type)) {
        const cset = this.components[component.type];
        cset.delete(component);
        if (cset.size === 0) {
          delete this.components[component.type];
          ecs.entityComponents.get(component.type).delete(this.id);
        }
      }
    } else {
      delete this.components[component.type];
      ecs.entityComponents.get(component.type).delete(this.id);
    }

    ecs.components.get(component.type).delete(component);
    if (!delayCache) {
      this.ecs._updateCache(this);
    }

    this.lastUpdate = this.ecs.ticks;
  }

}

module.exports = Entity;
