const BaseComponent = require('./component');
const UUID = require('uuid/v1');

class Entity {

  constructor(ecs, definition = {}) {

    Object.defineProperty(this, 'ecs', { enumerable: false, value: ecs });
    this.id = definition.id || UUID();
    Object.defineProperty(this, 'components', { enumerable: false, value: {} });
    Object.defineProperty(this, 'componentMap', { enumerable: false, value: {} });
    this.tags = new Set();
    Object.defineProperty(this, 'refs', { enumerable: false, writable: false, value: {} });
    Object.defineProperty(this, 'destroyed', { enumerable: false, writable: true, value: false });


    this.updatedComponents = this.ecs.ticks;
    this.updatedValues = this.ecs.ticks;

    for (const type of Object.keys(definition)) {
      if (type === 'id') continue;
      if (type === 'tags') {
        for (const tag of definition[type]) {
          this.tags.add(tag);
          this.ecs.entityComponents.get(tag).add(this.id);
        }
        continue;
      }
      const cdefs = definition[type];
      if (!ecs.types.hasOwnProperty(type)) throw new Error(`No component type named "${type}". Did you misspell it?`)
      const mapBy = ecs.types[type].definition.mapBy;
      if (Array.isArray(cdefs)) {
        for (const def of cdefs) {
          this.addComponent(type, def, true);
        }
      } else if (mapBy) {
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
    this.ecs._checkEntity(this);
  }

  has(tagOrComponent) {

    if (this.tags.has(tagOrComponent)) {
      return true;
    }
    return (this.components.hasOwnProperty(tagOrComponent));
  }

  addTag(tag) {

    this.tags.add(tag);
    this.updatedComponents = this.ecs.ticks;
    this.ecs.entityComponents.get(tag).add(this.id);
    this.ecs._checkEntity(this);
  }

  removeTag(tag) {
    this.tags.delete(tag);
    this.updatedComponents = this.ecs.ticks;
    this.ecs.entityComponents.get(tag).delete(this.id);
    this.ecs._checkEntity(this);
  }

  addComponent(type, definition, delayCache) {

    const ecs = this.ecs;
    const component = new ecs.types[type](ecs, this, definition);

    let addedType = false;
    if (ecs.types[type].definition.many) {
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
      this[component.type] = this.components[component.type];
    }

    ecs.entityComponents.get(component.type).add(this.id);
    ecs.components.get(component.type).add(component);

    this.updatedComponents = this.ecs.ticks;
    if (!delayCache) {
      this.ecs._checkEntity(this);
    }

    this.componentMap[component.id] = component;
    return component;
  }

  removeComponentByType(cname) {

    if (!this.components.hasOwnProperty(cname)) {
      return;
    }

    if (this.ecs.types[cname].definition.many) {
      for (const component of this.components[cname]) {
        this.removeComponent(component, true);
      }
      this.ecs._checkEntity(this);
    } else {
      this.removeComponent(this.components[cname]);
    }
  }

  removeComponent(component, delayCache, destroy=true) {

    if (!(component instanceof BaseComponent)) {
      component = this.componentMap[component];
    }
    component._updated('removeComponent');
    if (destroy) {
      component.destroy(false);
    }
    const ecs = this.ecs;
    const name = component.type;
    let removedType = false;
    if (ecs.types[name].definition.many) {
      const mapBy = ecs.types[name].definition.mapBy;
      if (mapBy) {
        const mapValue = component[mapBy]
        if (this.components.hasOwnProperty(component.type)
          && this.components[component.type].hasOwnProperty(mapValue)
          && this.components[component.type][mapValue].id === component.id
        ) {
          delete this.components[component.type][mapValue];
          if (Object.entries(this.components[component.type]).length === 0) {
            removedType = true;
          }
        } else {
          return;
        }
      } else {
        if (this.components.hasOwnProperty(component.type)) {
          const cset = this.components[component.type];
          cset.delete(component);
          if (cset.size === 0) {
            removedType = true;
          }
        } else {
          return;
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
      this.ecs._checkEntity(this);
    }

    delete this.componentMap[component.id];
    this.updatedComponents = this.ecs.ticks;
  }

  getObject() {

    const result = {};
    for (const type of Object.keys(this.components)) {
      const definition = this.ecs.types[type].definition;
      if (definition.serialize && definition.serialize.skip) continue;
      let next;
      if (this.components[type] instanceof Set) {
        next = [];
        for (const component of this.components[type]) {
          next.push(component.getObject());
        }
      } else if (definition.mapBy) {
        next = {};
        for (const key of Object.keys(this.components[type])) {
          next[key] = this.components[type][key].getObject();
        }
      } else {
        next = this.components[type].getObject();
      }
      result[type] = next;
    }
    return Object.assign({ id: this.id}, result);
  }

  destroy() {

    for (const key in this.componentMap) {
      this.componentMap[key].destroy();
    }
    if (this.ecs.refs[this.id]) {
      for (const ref of this.ecs.refs[this.id]) {
        const [entityId, componentId, prop, sub] = ref.split('...');
        const entity = this.ecs.getEntity(entityId);
        // remove coverage because I can't think of how this would go wrng
        /* $lab:coverage:off$ */
        if (!entity) continue;
        const component = entity.componentMap[componentId];
        if (!component) continue;
        /* $lab:coverage:on$ */
        const path = prop.split('.');
        if (!sub) {
          const last = path[path.length - 1];
          let t2 = component;
          /* $lab:coverage:off$ */
          for (let i = 0; i < path.length - 1; i++) {
            t2 = t2[path[i]];
          }
          /* $lab:coverage:on$ */
          t2[last] = null;
          continue;
        }

        let target = component;
        for (const prop of path) {
          target = target[prop];
        }
        if (sub === '__set__') {
          target.delete(this);
        } else {
          target[sub] = null;
        }
      }
    }
    this.ecs.entities.delete(this.id);
    this.destroyed = true;
  }

}

module.exports = Entity;
