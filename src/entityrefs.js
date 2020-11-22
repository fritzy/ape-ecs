class EntitySet extends Set {
  constructor(component, object, field) {
    super();
    this.component = component;
    this.field = field;
    this.sub = '__set__';
    object = object.map((value) =>
      typeof value === 'string' ? value : value.id
    );
    this.dvalue = object;
    for (const item of object) {
      this.add(item);
    }
  }

  _reset() {
    this.clear();
    for (const item of this.dvalue) {
      this.add(item);
    }
  }

  add(value) {
    if (value.id) {
      value = value.id;
    }
    this.component._addRef(value, this.field, '__set__');
    super.add(value);
  }

  delete(value) {
    if (value.id) {
      value = value.id;
    }
    this.component._deleteRef(value, this.field, '__set__');
    const res = super.delete(value);
    return res;
  }

  has(value) {
    if (value.id) {
      value = value.id;
    }
    return super.has(value);
  }

  [Symbol.iterator]() {
    const that = this;
    const siterator = super[Symbol.iterator]();
    return {
      next() {
        const result = siterator.next();
        if (typeof result.value === 'string') {
          result.value = that.component.entity.world.getEntity(result.value);
        }
        return result;
      }
    };
  }

  getValue() {
    return [...this].map((entity) => entity.id);
  }
}

module.exports = {
  EntityRef(comp, dvalue, field) {
    dvalue = dvalue || null;
    if (!comp.hasOwnProperty(field)) {
      Object.defineProperty(comp, field, {
        get() {
          return comp.world.getEntity(comp._meta.values[field]);
        },
        set(value) {
          const old = comp._meta.values[field];
          value = value && typeof value !== 'string' ? value.id : value;
          if (old && old !== value) {
            comp._deleteRef(old, field, undefined);
          }
          if (value && value !== old) {
            comp._addRef(value, field, undefined);
          }
          comp._meta.values[field] = value;
        }
      });
    }
    comp[field] = dvalue;
    return;
  },

  EntityObject(comp, object, field) {
    comp._meta.values[field] = object || {};
    const values = comp._meta.values[field];
    const keys = Object.keys(values);
    for (const key of keys) {
      if (values[key] && values[key].id) {
        values[key] = values[key].id;
      }
    }
    return new Proxy(comp._meta.values[field], {
      get(obj, prop) {
        return comp.world.getEntity(obj[prop]);
      },
      set(obj, prop, value) {
        const old = obj[prop];
        if (value && value.id) {
          value = value.id;
        }
        obj[prop] = value;
        if (old && old !== value) {
          comp._deleteRef(old, `${field}.${prop}`, '__obj__');
        }
        if (value && value !== old) {
          comp._addRef(value, `${field}.${prop}`, '__obj__');
        }
        return true;
      },
      deleteProperty(obj, prop) {
        if (!obj.hasOwnProperty(prop)) return false;
        const old = obj[prop];
        delete obj[prop];
        comp._deleteRef(old, `${field}.${prop}`, '__obj__');
        return true;
      }
    });
  },

  EntitySet(component, object = [], field) {
    return new EntitySet(component, object, field);
  }
};
