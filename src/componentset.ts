import { Component } from './component'; 

export default class ComponentSet<Component> extends Set<Component> {

  add(item: Component): this {
    /* istanbul ignore next */
    if (item instanceof Component) {
      if (this[item.key] && this[item.key] !== item) throw new Error(`ComponentSet already has key "${item.key}"`);
      super.add(item)
      this[item.key] = item;
    }
    return this;
  }

  delete(item: Component): boolean {
    if (item instanceof Component) {
      const result = super.delete(item)
      delete this[item.key]
      return result;
    }
    return false;
  }

  updateKey(item: Component, old: string, key: string) {
    if (this[key]) throw new Error(`ComponentSet already has a component with the key "${key}"`);
    delete this[old];
    this[key] = item;
  }

  get first() {
    return this.values().next().value;
  }

}
