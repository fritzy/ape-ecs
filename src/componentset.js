class ComponentSet extends Set {

  add(item) {
    /* istanbul ignore next */
    if (this[item.key] && this[item.key] !== item) throw new Error(`ComponentSet already has key "${key}"`);
    super.add(item)
    this[item.key] = item;
  }

  delete(item) {
    super.delete(item)
    delete this[item.key]
  }

  updateKey(item, old, key) {
    if (this[key]) throw new Error(`ComponentSet already has a component with the key "${key}"`);
    delete this[old];
    this[key] = item;
  }

  get first() {
    return this.values().next().value;
  }

}

module.exports = ComponentSet;
