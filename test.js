const ECS = require('./index');

const ecs = new ECS();
ecs.registerComponent('Health', {
  properties: {
    max: 25,
    hp: 25,
    armor: 0
  }
});

ecs.registerComponent('Storage', {
  properties: {
    name: 'Inventory',
    size: 10,
    inventory: '<EntityArray>'
  },
  multiset: true
});

const entity = ecs.createEntity({
  components: {
    Health: [{ hp: 10 }],
    Storage: [{ size: 20 }],
  }
});

const entity2 = ecs.createEntity({
  components: {
    Health: [{ hp: 10 }],
  }
});

console.log(entity);
console.log(ecs.queryEntities({has: ['Health']}).length);
const withstorage = ecs.queryEntities({has: ['Health', 'Storage']});
console.log('withstorage', withstorage.length);
const nostorage = ecs.queryEntities({has: ['Health'], hasnt: ['Storage'], cache: 'nostorage'});
console.log('nostorage', nostorage.length);
console.log('.....');
const nostorage2 = ecs.queryEntities('nostorage');
console.log('nostorage cache', nostorage2.length);
entity.clearComponents('Storage');
const nostorage3 = ecs.queryEntities('nostorage');
console.log('nostorage cache2', nostorage3.length);
const withstorage2 = ecs.queryEntities({has: ['Health', 'Storage']});
console.log('withstorage2', withstorage2.length);
