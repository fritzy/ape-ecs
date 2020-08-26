class ComponentPool {

  constructor(world, type, spinup) {

    this.world = world;
    this.type = type;
    this.klass = this.world.componentTypes[this.type];
    this.pool = [];
    this.spinUp(spinup);
  }

  get(entity, initial) {

    let comp;
    if (this.pool.length === 0) {
      comp = new this.klass(entity, initial);
    } else {
      comp = this.pool.pop();
    }
    comp._setup(entity, initial);
    return comp;
  }

  release(comp) {

    comp._reset();
    //comp._meta.entity = null;
    this.pool.push(comp);
  }

  spinUp(count) {

    for(let i = 0; i < count; i++) {
      const comp = new this.klass();
      this.pool.push(comp);
    }
  }
}

module.exports = ComponentPool;
