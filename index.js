const BaseComponent = require('./component');

const componentMethods = new Set(['stringify', 'clone', 'getObject', Symbol.iterator]);
const componentProperties = new Set(['type']);

class ECS {

  constructor() {

    this.components = new Map();
    this.types = {};
    this.ticks = 0;
    this.nextEntity = 0;
    this.entities = new Map();
    this.entityTypes = new Map();
  }

  tick() {

    this.ticks++;
    return this.ticks;
  }

  registerComponent(name, definition = {}) {

    if (!definition.hasOwnProperty('entityRefs')) {
      definition.entityRefs = [];
    };
    definition.entityRefs.push('entity');
    const klass = class Component extends BaseComponent {}
    klass.definition = definition;
    Object.defineProperty(klass, 'name', {value: name});
    this.types[name] = klass;
    return klass;
  }

  newComponent(name, values = {}) {

    const ecs = this;
    const component = new this.types[name](this, values);
    if (!this.components.has(name)) {
      this.components.set(name, new Set());
    }
    this.components.get(name).add(component);
    if (values.hasOwnProperty('entity')) {
      this.setEntity(values.entity, component);
    }
    return component;
  }

  createEntity(definition) {
  }

  getEntity(entityId) {

    return this.entities.get(entityId);
  }

  setEntity(entity, component) {

    if (entity !== null && entity !== undefined) {
      if (!this.entities.has(entity)) {
        this.entities.set(entity, new Set());
        this.entityTypes.set(entity, new Set());
      }
      const entitySet = this.entities.get(entity);
      const entityTypes = this.entityTypes.get(entity);
      entitySet.add(component);
      entityTypes.add(component.type);
    } else if (this.components.has(component.type)) {
      // orphaned component
      this.components.get(component.type).delete(component);
    }

    if (component.entity !== entity) {
      const old = this.entities.get(component.entity);
      if (old) old.delete(component);
      const oldTypes = this.entityTypes.get(entity);
      if (oldTypes) oldTypes.delete(component.type);
    }

  }

  getEntities(has, hasnt = [], cache = false) {
    const mustHave = new Set(has);
    for (entity of this.entities) {
    }
  }

  getComponents(name) {

    return this.components.get(name);
  }

}




const ecs = new ECS();
ecs.registerComponent('Health', {
  properties: {hp: 25,
    armor: 0
  }
});

ecs.registerComponent('Storage', {
  properties: {
    size: 10,
  },
  entities: true
});

const component = ecs.newComponent('Health', {
  hp: 30,
  entity: 1
});

const component2 = ecs.newComponent('Storage');
console.log(component2);
console.log(component2.stringify());


console.log('--------------------');
console.log(component);
console.log('--------------------');
console.log(component.stringify());
console.log('.............');
const comp2 =  component.clone();
comp2.hp = 10;
comp2.type = 'Bill';
console.log(component.stringify());
console.log(comp2.stringify());
console.log(ecs.entities);
console.log(ecs.entityTypes);
