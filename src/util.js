class IdGenerator {
  constructor() {
    this.gen_num = 0;
    this.prefix = '';
    this.genPrefix();
  }

  genPrefix() {
    this.prefix = Date.now().toString(32);
  }

  genId() {
    this.gen_num++;
    // istanbul ignore if
    if (this.gen_num === 4294967295) {
      this.gen_num = 0;
      this.genPrefix();
    }
    return this.prefix + this.gen_num;
  }
}

function setIntersection() {
  let sets = Array.from(arguments),
    setSizes = sets.map((set) => set.size),
    smallestSetIndex = setSizes.indexOf(Math.min.apply(Math, setSizes)),
    smallestSet = sets[smallestSetIndex],
    result = new Set(smallestSet);

  sets.splice(smallestSetIndex, 1);

  smallestSet.forEach((value) => {
    for (let i = 0; i < sets.length; i += 1) {
      if (!sets[i].has(value)) {
        result.delete(value);
        break;
      }
    }
  });

  return result;
}

function setUnion() {
  let result = new Set();

  Array.from(arguments).forEach((set) => {
    set.forEach((value) => result.add(value));
  });

  return result;
}

module.exports = {
  IdGenerator,
  setIntersection,
  setUnion
};
