class ComponentSet extends Set {

  add(item) {
    super.add(item)
    if (this[item.key] && this[item.key] !== item) throw new Error(`ComponentSet already has a component with the key "${item.key}"`);
    this[item.key] = item;
  }

  delete(item) {
    super.delete(item)
    delete this[item.key]
  }

  updateKey(item, old, key) {
    if (this[key]) throw new Error(`ComponentSet already has a component with the key "${item.key}"`);
    delete this[old];
    this[key] = item;
  }

  get 0() {
    if (this.size === 0) return undefined;
    return this.values().next().value;
  }

}

module.exports = ComponentSet;
