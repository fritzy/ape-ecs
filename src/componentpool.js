class ComponentPool {
  constructor(world, type, spinup) {
    this.world = world;
    this.type = type;
    this.klass = this.world.componentTypes[this.type];
    this.pool = [];
    this.targetSize = spinup;
    this.active = 0;
    this.spinUp(spinup);
  }

  get(entity, initial) {
    let comp;
    if (this.pool.length === 0) {
      comp = new this.klass(this.world);
    } else {
      comp = this.pool.pop();
    }
    comp._setup(entity, initial);
    this.active++;
    return comp;
  }

  release(comp) {
    comp._reset();
    //comp._meta.entity = null;
    this.pool.push(comp);
    this.active--;
  }

  cleanup() {
    if (this.pool.length > this.targetSize * 2) {
      const diff = this.pool.length - this.targetSize;
      const chunk = Math.max(Math.min(20, diff), Math.floor(diff / 4));
      for (let i = 0; i < chunk; i++) {
        this.pool.pop();
      }
    }
  }

  spinUp(count) {
    for (let i = 0; i < count; i++) {
      const comp = new this.klass(this.world);
      this.pool.push(comp);
    }
    this.targetSize = Math.max(this.targetSize, this.pool.length);
  }
}

module.exports = ComponentPool;
