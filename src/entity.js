const BaseComponent = require('./component');

let ids = 0;

class Entity {

  constructor(ecs, definition = {}) {

    Object.defineProperty(this, 'ecs', { enumerable: false, value: ecs });
    if (!definition.id) {
      this.id = ids++;
    } else {
      this.id = definition.id;
    }
    this.id = `${this.id}`;
    Object.defineProperty(this, 'components', { enumerable: false, value: {} });
    Object.defineProperty(this, 'componentMap', { enumerable: false, value: {} });
    Object.defineProperty(this, 'refs', { enumerable: false, value: new Set() });

    this.updatedComponents = this.ecs.ticks;
    this.updatedValues = this.ecs.ticks;

    for (const type of Object.keys(definition)) {
      if (type === 'id') continue;
      const cdefs = definition[type];
      const mapBy = ecs.types[type].definition.mapBy;
      if (Array.isArray(cdefs)) {
        for (const def of cdefs) {
          this.addComponent(type, def, true);
        }
      } else if (mapBy && typeof cdefs === 'object') {
        for (const key of Object.keys(cdefs)) {
          const def = cdefs[key];
          def[mapBy] = key;
          this.addComponent(type, def, true);
        }
      } else {
        this.addComponent(type, cdefs, true);
      }
    }
    this.ecs.entities.set(this.id, this);
    this.ecs._updateCache(this);
  }

  addRef(entity, component, prop, sub) {
    this.refs.add([entity, component, prop, sub].join('...'));
  }

  remRef(entity, component, prop, sub) {
    this.refs.add([entity, component, prop, sub].join('...'));
  }

  addComponent(type, definition, delayCache) {

    const ecs = this.ecs;
    const component = new ecs.types[type](ecs, this, definition);

    let addedType = false;
    if (ecs.types[type].definition.multiset) {
      const mapBy = ecs.types[type].definition.mapBy;
      if (mapBy) {
        if (!this.components.hasOwnProperty(component.type)) {
          this.components[component.type] = {};
          addedType = true;
        }
        this.components[component.type][component[mapBy]] = component;
      } else {
        if(!this.components.hasOwnProperty(component.type)) {
          this.components[component.type] = new Set([component]);
          addedType = true;
        } else {
          this.components[component.type].add(component);
        }
      }
    } else {
      if(this.components.hasOwnProperty(component.type)) {
        throw new Error(`Entity<${this.id}> already has component ${component.type}`)
      }
      this.components[component.type] = component;
      addedType = true;
    }
    if (addedType) {
      Object.defineProperty(this, component.type, {
        configurable: true,
        enumerable: true,
        get: () => {
          return Reflect.get(this.components, component.type);
        }
      });
    }

    ecs.entityComponents.get(component.type).add(this.id);
    ecs.components.get(component.type).add(component);


    this.updatedComponents = this.ecs.ticks;
    if (!delayCache) {
      this.ecs._updateCache(this);
    }

    this.componentMap[component.id] = component;
    return component;
  }

  removeComponentByName(cname) {

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

    if (!(component instanceof BaseComponent)) {
      component = this.componentMap[component];
    }
    const ecs = this.ecs;
    const name = component.type;
    let removedType = false;
    if (ecs.types[name].definition.multiset) {
      const mapBy = ecs.types[name].definition.mapBy;
      if (mapBy) {
        if (this.components.hasOwnProperty(component.type)
          && this.components[component.type].hasOwnProperty(mapBy)) {
          delete this.components[component.type][mapBy];
          if (Object.entries(obj).length === 0) {
            removedType = true;
          }
        }
      } else {
        if (this.components.hasOwnProperty(component.type)) {
          const cset = this.components[component.type];
          cset.delete(component);
          if (cset.size === 0) {
            removedType = true;
          }
        }
      }
    } else {
      removedType = true;
    }
    if (removedType) {
      ecs.entityComponents.get(component.type).delete(this.id);
      delete this.components[component.type];
      delete this[component.type];
    }


    ecs.components.get(component.type).delete(component);
    if (!delayCache) {
      this.ecs._updateCache(this);
    }

    delete this.componentMap[component.id];
    this.updatedComponents = this.ecs.ticks;
  }

  destroy() {

    this.ecs._clearEntityFromCache(this);
    for (const ref of this.refs) {
      const [entityId, componentId, prop, sub] = ref.split('...');
      const entity = this.ecs.getEntity(entityId);
      if (!entity) continue;
      const component = entity.componentMap[componentId];
      if (!component) continue;
      if (!sub) {
        component[prop] = null;
      } else {
        component[prop][sub] = null;
      }
    }
    this.ecs.entities.delete(this.id);
  }

}

module.exports = Entity;
