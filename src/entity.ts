import { IdGenerator } from './util';
const idGen = new IdGenerator();

import ComponentSet from './componentset';
import { Component } from './component';
import { World } from './world';

export default class Entity {

  id: string;
  tags: Set<string>;
  links: Set<any>;
  c: any;
  updatedComponents: number;
  updatedValues: number;
  destroyed: boolean;
  ready: boolean;
  bitmask: bigint;
  reverse: Set<any>;
  world: World;

  constructor() {
    this.id = '';
    this.tags = new Set();
    this.links = new Set();
    this.c = {};
    this.updatedComponents = 0;
    this.updatedValues = 0;
    this.destroyed = false;
    this.ready = false;
    this.bitmask = 0n;
    this.reverse = new Set();
    this.world = undefined;
  }

  _setup(world, definition) {
    this.world = world;
    this.destroyed = false;
    if (definition.id) {
      this.id = definition.id;
      delete definition.id;
    } else {
      this.id = idGen.genId();
    }
    this.world.entities.set(this.id, this);

    this.updatedComponents = this.world.currentTick;

    if (definition.tags) {
      this.addTag(...definition.tags);
    }

    if (definition.c) {
      for (const type of Object.keys(definition.c)) {
        if (Array.isArray(definition.c[type])) {
          for (const def of definition.c[type]) {
            this.addComponent(type, def);
          }
        } else {
          for (const key of Object.keys(definition.c[type])) {
            const def = definition.c[type][key];
            def.key = key;
            this.addComponent(type, def);
          }
        }
      }
    }

    this.ready = true;
    this.world._entityUpdated(this);
  }

  _linkComponent(component) {
    this.links.add(component);
  }

  _unlinkComponent(component) {
    this.links.delete(component);
  }

  has(type: string | any): boolean {
    if (typeof type !== 'string') {
      type = type.name;
    }
    return this.tags.has(type) || this.c.hasOwnProperty(type);
  }

  addTag(...tags: (string | any)[]) {
    for (const tag of tags) {
      if (!this.world.registry.tags.has(tag)) {
        throw new Error(`addTag "${tag}" is not registered. Typo?`);
      }
      if (this.tags.has(tag)) {
        return;
      }
      this.tags.add(tag);
      this.bitmask |= 1n << this.world.registry.typenum.get(tag);
      this.world.entitiesByComponent[tag].add(this);
    }
    this.updatedComponents = this.world.currentTick;
    if (this.ready) {
      this.world._entityUpdated(this);
    }
  }

  removeTag(tag) {
    if (!this.tags.has(tag)) {
      return;
    }
    this.bitmask &= ~(1n << this.world.registry.typenum.get(tag));
    this.tags.delete(tag);
    this.updatedComponents = this.world.currentTick;
    this.world.entitiesByComponent[tag].delete(this);
    this.world._entityUpdated(this);
  }

  addComponent(type, properties) {
    if (typeof type !== 'string') {
      type = type.name;
    }
    const pool = this.world.registry.pool.get(type);
    if (pool === undefined) {
      throw new Error(`Component "${type}" has not been registered.`);
    }
    const comp = pool.get(this.world, this, properties);
    if (!this.c[type]) {
      this.c[type] = new ComponentSet();
    }
    if (this.c[type].size === 0) {
      this.bitmask |= 1n << this.world.registry.typenum.get(type);
    }
    this.c[type].add(comp);
    this.world._addEntityComponent(type, this);
    if (this.ready) {
      this.updatedComponents = this.world.currentTick;
      this.world._entityUpdated(this);
    }
    return this;
  }

  removeComponent(component) {
    this.c[component.type].delete(component);

    if (this.c[component.type].size === 0) {
      this.bitmask &= ~(1n << this.world.registry.typenum.get(component.type));
      delete this.c[component.type];
    }
    this.world._deleteEntityComponent(component);
    this.world._entityUpdated(this);
    component.destroy();
    return this;
  }

  getObject(componentIds = true) {
    const obj = {
      id: this.id,
      tags: [...this.tags],
      c: {}
    };
    for (const type of Object.keys(this.c)) {
      if(!this.world.registry.types[type].serialize) {
        continue;
      }
      obj.c[type] = {};
      for (const comp of this.c[type]) {
        obj.c[type][comp.key] = comp.getObject(componentIds);
      }
    }
    return obj;
  }

  destroy(now=false) {

    /* istanbul ignore next */
    if (this.destroyed) return;
    if (!now && this.world.config.useApeDestroy) {
      this.addTag('ApeDestroy');
      return;
    }
    this.ready = false;
    for (const link of this.links) {
      this._unlinkComponent(link);
    }
    for (const type of Object.keys(this.c)) {
      for (const component of this.c[type]) {
        this.removeComponent(component);
      }
    }
    for (const tag of this.tags) {
      this.removeTag(tag);
    }
    this.world._entityUpdated(this);
    this.world.entities.delete(this.id);
    this.destroyed = true;
    this.world.entityPool.destroy(this);
    this.world._clearIndexes(this);
  }
}
