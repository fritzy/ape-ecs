const ComponentPool = require('./componentpool');

const componentReserved = new Set([
  'constructor',
  'init',
  'id',
  'type',
  'key',
  'destroy',
  'getObject',
  '_setup',
  'clear',
  '_reset',
  'update',
  'clone',
  'prototype'
]);

class ComponentRegistry {

  constructor() {

    this.types = {};
    this.typeset = new Set();
    this.typenum = new Map();
    this.pool = new Map();
    this.tags = new Set();
    this.componentNum = 0n;
    this.worlds = new Set();
  }

  addWorld(world) {

    this.worlds.add(world);
  }

  registerComponent(klass, spinup) {

    if (klass.typeName && klass.name !== klass.typeName) {
      Object.defineProperty(klass, 'name', { value: klass.typeName });
    }
    const name = klass.name;
    // istanbul ignore if
    if (this.tags.has(name)) {
      throw new Error(`registerComponent: Tag already defined for "${name}"`);
    } /* istanbul ignore if */ else if (
      this.types.hasOwnProperty(name)
    ) {
      throw new Error(
        `registerComponent: Component already defined for "${name}"`
      );
    }
    this.typeset.add(name);
    this.types[name] = klass;
    klass.bitdigit = this.componentNum;
    this.typenum.set(name, this.componentNum);
    this.componentNum += 1n;
    if (!(klass.properties instanceof Set)) {
      throw new Error('Components must have the static Set property "properties"');
    }
    for (const field of klass.properties) {
      // istanbul ignore if
      if (componentReserved.has(field)) {
        throw new Error(
          `Error registering ${klass.name}: Reserved property name "${field}"`
        );
      }
    }
    this.pool.set(name, new ComponentPool(this, name, spinup));
  }

  registerTags(...tags) {
    for (const tag of tags) {
      // istanbul ignore if
      if (this.typeset.has(tag)) {
        throw new Error(`Cannot register tag "${tag}", name is already taken.`);
      }
      this.typeset.add(tag);
      this.typenum.set(tag, this.componentNum);
      this.componentNum += 1n;
      this.tags.add(tag);
    }
  }

  clear() {
    this.types = {};
    this.typeset.clear();
    this.typenum.clear();
    this.pool = new Map();
    this.tags = new Set();
    this.componentNum = 0n;
  }
}

const singletonRepo = new ComponentRegistry();

module.exports = {
  singletonRepo,
  ComponentRegistry
};
