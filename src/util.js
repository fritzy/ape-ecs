const crypto = require('crypto');

let gen_last = Date.now();
const gen_rnd = new Buffer.allocUnsafe(8);
const gen_time = new Buffer.allocUnsafe(4);
const gen_iter = new Buffer.allocUnsafe(4);
const MAX = 4294967295;
let gen_num = 0;
let prefix = '';

const genPrefix = () => {

  gen_last = Date.now();
  crypto.randomFillSync(gen_rnd);
  gen_time.writeUInt32BE(gen_last >>> 0);
  prefix = `${gen_rnd.toString('hex')}-${gen_time.toString('hex')}-`;
};


genPrefix();

const genId = () => {

  gen_num++;
  if (gen_num === MAX) {
  gen_num = 0;
  genPrefix();
  }
  return prefix + gen_num;
};


function setIntersection() {
  let sets = Array.from(arguments),
    setSizes = sets.map(set => set.size),
    smallestSetIndex = setSizes.indexOf(Math.min.apply(Math, setSizes)),
    smallestSet = sets[smallestSetIndex],
    result = new Set(smallestSet);

  sets.splice(smallestSetIndex, 1);

  smallestSet.forEach(value => {
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
    let result = new Set;

    Array.from(arguments).forEach(set => {
        set.forEach(value => result.add(value));
    });

    return result;
}

module.exports = {
  genId,
  setIntersection,
  setUnion
};
