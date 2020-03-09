const { expect } = require('@hapi/code');
const Lab = require('@hapi/lab');
const lab = exports.lab = Lab.script();

const ECS = require('../src/index');

lab.experiment('express components', () => {

  const ecs = new ECS.ECS();
  ecs.registerComponent('Health', {
    properties: {
      max: 25,
      hp: 25,
      armor: 0
    }
  });

  lab.before(({ context }) => {

  });

  lab.test('create entity', () => {

    ecs.createEntity({
      Health: [ { hp: 10 } ]
    });

    const results = ecs.queryEntities({ has: ['Health'] });

    expect(results.size).to.equal(1);
  });

  lab.test('create entity without array', () => {

    ecs.createEntity({
      Health: { hp: 10 }
    });

    const results = ecs.queryEntities({ has: ['Health'] });

    expect(results.size).to.equal(2);
  });

  lab.test('entity refs', () => {

    ecs.registerComponent('Storage', {
      properties: {
        name: 'inventory',
        size: 20,
        items: '<EntitySet>'
      },
      multiset: true,
      mapBy: 'name'
    });

    ecs.registerComponent('EquipmentSlot', {
      properties: {
        name: 'finger',
        slot: '<Entity>',
        effects: '<ComponentSet>'
      },
      multiset: true,
      mapBy: 'name'
    });

    ecs.registerComponent('Food', {
      properties: {
        rot: 300,
        restore: 2
      },
    });

    const food = ecs.createEntity({
      id: 'sandwich10', // to exersize custom id
      Food: {}
    });

    const entity = ecs.createEntity({
      Storage: {
        pockets: { size: 4 },
        backpack: { size: 25 }
      },
      EquipmentSlot: {
        pants: {},
        shirt: {}
      },
      Health: {
        hp: 10,
        max: 10
      }
    });

    entity.components.Storage.pockets.items.add(food);

    const entityObj = entity.getObject();
    delete entityObj.id;
    const eJson = JSON.stringify(entityObj);
    const entityDef = JSON.parse(eJson);

    const entity2 = ecs.createEntity(entityDef);

    expect(entity.components.Storage.pockets.items.has(food)).to.be.true();
    expect(entity2.components.Storage.pockets.items.has(food)).to.be.true();

    ecs.removeEntity(food);

    expect(ecs.getEntity(food.id)).to.be.undefined();
    ecs.removeEntity(entity.id);

    expect(ecs.getEntity(entity.id)).to.be.undefined();

  });

  lab.test('init and destroy component', () => {

    let hit = false;

    const ecs = new ECS.ECS();
    ecs.registerComponent('Test', {
      properties: {
        x: null,
        y: 0
      },
      destroy() {
        this.x = null;
        hit = true;
      },
      init() {
        this.y++;
      }
    });

    const entity = ecs.createEntity({
      Test: {
      }
    });

    expect(entity.Test.y).to.equal(1);
    expect(hit).to.equal(false);

    entity.removeComponent(entity.Test);
    expect(hit).to.equal(true);

  });

  lab.test('system subscriptions', () => {

    let changes = [];
    let changes2 = [];
    let effectExt = null;
    /* $lab:coverage:off$ */
    class System extends ECS.System {

      constructor(ecs) {

        super(ecs);
        //this.ecs.subscribe(this, 'EquipmentSlot');
      }

      update(tick) {

        changes = this.changes;
        for (const change of this.changes) {
          const parent = change.component.entity;
          if (change.component.type === 'EquipmentSlot'
          && change.op === 'setEntity') {
            if (change.value !== null) {
              const value = this.ecs.getEntity(change.value);
              if (value.hasOwnProperty('Wearable')) {
                const components = [];
                for (const ctype of Object.keys(value.Wearable.effects)) {
                  const component = parent.addComponent(ctype, value.Wearable.effects[ctype]);
                  components.push(component);
                }
                if (components.length > 0) {
                  const effect = parent.addComponent('EquipmentEffect', { equipment: value.id });
                  for (const c of components) {
                    effect.effects.add(c);
                    effectExt = c;
                  }
                }
              }
            } else if (change.old !== null && change.value !== change.old) {
              for (const effect of parent.EquipmentEffect) {
                if (effect.equipment === change.old) {
                  for (const comp of effect.effects) {
                    parent.removeComponent(comp);
                  }
                  parent.removeComponent(effect);
                }
              }
            }
          }
        }
      }
    }
    System.subscriptions = ['EquipmentSlot'];

    class System2 extends ECS.System {

      constructor(ecs) {

        super(ecs);
        this.ecs.subscribe(this, 'EquipmentSlot');
      }

      update(tick) {

        if (this.changes.length > 0) {
          //make sure it is a separate object
          this.changes[0] = null;
        }
        changes2 = this.changes;
      }
    }
    /* $lab:coverage:on */

    ecs.registerComponent('EquipmentEffect', {
      properties: {
        equipment: '',
        effects: '<ComponentSet>'
      },
      multiset: true
    });

    ecs.registerComponent('Wearable', {
      properties: {
        name: 'ring',
        effects: {
          Burning: {}
        }
      },
    });

    ecs.registerComponent('Burning', {
      properties: {
      },
    });

    const system = new System(ecs);
    //const system2 = new System2(ecs);

    ecs.addSystem('equipment', system);
    ecs.addSystem('equipment', System2);

    ecs.runSystemGroup('equipment');

    const entity = ecs.createEntity({
      Storage: {
        pockets: { size: 4 },
        backpack: { size: 25 }
      },
      EquipmentSlot: {
        pants: {},
        shirt: {}
      },
      Health: {
        hp: 10,
        max: 10
      }
    });

    const pants = ecs.createEntity({
      Wearable: { name: 'Nice Pants',
        effects: {
          Burning: {}
        }
      }
    });

    ecs.runSystemGroup('equipment');
    expect(changes.length).to.equal(0);

    entity.EquipmentSlot.pants.slot = pants;

    ecs.runSystemGroup('equipment');

    expect(entity.EquipmentEffect).to.exist();
    expect([...entity.EquipmentEffect][0].effects.has(effectExt)).to.be.true();
    expect([...entity.EquipmentEffect][0].effects.has(effectExt.id)).to.be.true();
    expect(entity.Burning).to.exist();
    expect(changes.length).to.equal(1);
    expect(changes[0].op).to.equal('setEntity');
    expect(changes[0].value).to.equal(pants.id);
    expect(changes[0].old).to.equal(null);

    //entity.EquipmentSlot.pants.slot = null;
    pants.destroy();
    ecs.runSystemGroup('equipment');

    ecs.runSystemGroup('asdf'); //code path for non-existant system

    expect(changes2.length).to.be.greaterThan(0);
    expect(changes2[0]).to.be.null();
    expect(changes.length).to.be.greaterThan(0);
    expect(changes[0].value).to.be.null();
    expect(entity.EquipmentEffect).to.not.exist();
    expect(entity.Burning).to.not.exist();

  });

  lab.test('component pointers', () => {

    const ecs = new ECS.ECS();

    ecs.registerComponent('Position', {
      properties: {
        x: '<Pointer container.position.x>',
        y: '<Pointer container.position.y>',
        container: null
      }
    });

    const entity1 = ecs.createEntity({
      Position: {
        x: 10,
        y: 12
      }
    });

    expect(entity1.Position.x).to.be.equal(10);
    expect(entity1.Position.y).to.be.equal(12);

    entity1.Position.container = { position: { x: 33, y: 1 } };

    expect(entity1.Position.x).to.be.equal(33);
    expect(entity1.Position.y).to.be.equal(1);

    entity1.Position.x = 21;
    entity1.Position.y = 34;

    expect(entity1.Position.x).to.be.equal(21);
    expect(entity1.Position.y).to.be.equal(34);
    expect(entity1.Position.container.position.x).to.be.equal(21);
    expect(entity1.Position.container.position.y).to.be.equal(34);

  });

});


lab.experiment('component inheritance', () => {

  const ecs = new ECS.ECS();

  lab.test('register component class', () => {

    class Component1 extends ECS.Component {
    }
    Component1.definition = {};
    ecs.registerComponentClass(Component1);

    const entity = ecs.createEntity({
      Component1: {}
    });

    expect(entity.Component1).to.exist()
  });

  lab.test('override core properties', { plan: 1 }, (flags) => {

    class Component3 extends ECS.Component {
    }
    Component3.definition = {};

    ecs.registerComponentClass(Component3);
    class Component4 extends Component3 {}
    Component4.definition = {
      properties: {
        id: 'hi',
        entity: 'whatever'
      }
    };

    ecs.registerComponentClass(Component4);

    try {
      ecs.createEntity({
        Component4: {}
      });
    } catch (err) {
      expect(err).to.be.an.error();
    }
  });

  lab.test('override inherited properties', () => {

    class Component6 extends ECS.Component {
    }
    Component6.definition = {
      properties: {
        greeting: 'hi'
      }
    };

    class Component7 extends Component6 {
    }
    Component7.definition = {
      properties: {
        greeting: 'hello'
      }
    };

    ecs.registerComponentClass(Component7);

    const entity = ecs.createEntity({
      Component7: {}
    });

    expect(entity.Component7.greeting).to.equal('hello');

  });

});

lab.experiment('system queries', () => {

  const ecs = new ECS.ECS();

  lab.test('add and remove forbidden component', () => {

    ecs.registerComponent('Tile', {
      properties: {
        x: 0,
        y: 0,
        level: 0
      }
    });

    ecs.registerComponent('Hidden', {
      properties: {}
    });

    class TileSystem extends ECS.System {

      constructor(ecs) {
        super(ecs);
        this.lastResults =[];
      }

      update(tick, entities) {
        this.lastResults = entities;
      }
    }
    TileSystem.query = {
      has: ['Tile'],
      hasnt: ['Hidden']
    };

    const tileSystem = new TileSystem(ecs);
    ecs.addSystem('map', tileSystem);

    ecs.runSystemGroup('map');

    expect(tileSystem.lastResults.size).to.equal(0);

    const tile1 = ecs.createEntity({
      Tile: {
        x: 10,
        y: 0,
        level: 0
      }
    });

    const tile2 = ecs.createEntity({
      Tile: {
        x: 11,
        y: 0,
        level: 0
      },
      Hidden: {}
    });

    ecs.runSystemGroup('map');

    expect(tileSystem.lastResults.size).to.equal(1);
    expect(tileSystem.lastResults.has(tile1)).to.be.true();

    tile2.removeComponent(tile2.Hidden);

    ecs.runSystemGroup('map');

    expect(tileSystem.lastResults.size).to.equal(2);
    expect(tileSystem.lastResults.has(tile1)).to.be.true();
    expect(tileSystem.lastResults.has(tile1)).to.be.true();

    tile1.addComponent('Hidden', {});

    ecs.runSystemGroup('map');

    expect(tileSystem.lastResults.size).to.equal(1);
    expect(tileSystem.lastResults.has(tile2)).to.be.true();


  });

  lab.test('multiple has and hasnt', () => {
    ecs.registerComponent('Billboard', {});
    ecs.registerComponent('Sprite', {});

    const tile1 = ecs.createEntity({
      Tile: {},
      Billboard: {},
      Sprite: {},
      Hidden: {}
    });

    const tile2 = ecs.createEntity({
      Tile: {},
      Billboard: {},
    });

    const tile3 = ecs.createEntity({
      Tile: {},
      Billboard: {},
      Sprite: {}
    });

    const tile4 = ecs.createEntity({
      Tile: {},
    });

    const tile5 = ecs.createEntity({
      Billboard: {},
    });

    const result = ecs.queryEntities({
      has: ['Tile', 'Billboard'],
      hasnt: ['Sprite', 'Hidden']
    });

    const resultSet = new Set([...result]);

    expect(resultSet.has(tile1)).to.be.false();
    expect(resultSet.has(tile2)).to.be.true();
    expect(resultSet.has(tile3)).to.be.false();
    expect(resultSet.has(tile4)).to.be.false();
    expect(resultSet.has(tile5)).to.be.false();

  });

  lab.test('tags', () => {
    const ecs = new ECS.ECS();
    ecs.registerComponent('Tile', {});
    ecs.registerComponent('Sprite', {});
    ecs.registerTags(['Billboard']);
    ecs.registerTags('Hidden');

    const tile1 = ecs.createEntity({
      tags: ['Billboard', 'Hidden'],
      Tile: {}
    });

    const tile2 = ecs.createEntity({
      tags: ['Billboard'],
      Tile: {}
    });

    const tile3 = ecs.createEntity({
      tags: ['Billboard'],
      Sprite: {}
    });

    const tile4 = ecs.createEntity({
      Tile: {},
    });

    const tile5 = ecs.createEntity({
      tags: ['Billboard']
    });

    const result = ecs.queryEntities({
      has: ['Tile', 'Billboard'],
      hasnt: ['Sprite', 'Hidden'],
      persist: 'bill'
    });

    const resultSet = new Set([...result]);

    expect(resultSet.has(tile1)).to.be.false();
    expect(resultSet.has(tile2)).to.be.true();
    expect(tile2.has('Sprite')).to.be.false();
    expect(resultSet.has(tile3)).to.be.false();
    expect(resultSet.has(tile4)).to.be.false();
    expect(resultSet.has(tile5)).to.be.false();

    const result3 = ecs.queryEntities({
      has: ['Hidden']
    });
    const resultSet3 = new Set([...result3]);

    expect(resultSet3.has(tile1)).to.be.true();
    expect(resultSet3.has(tile2)).to.be.false();
    expect(resultSet3.has(tile3)).to.be.false();
    expect(resultSet3.has(tile4)).to.be.false();
    expect(resultSet3.has(tile5)).to.be.false();

    tile4.addTag('Billboard');
    tile2.removeTag('Hidden');
    tile1.removeTag('Hidden');
    tile3.addComponent('Tile', {});
    tile3.addTag('Hidden');
    tile1.removeTag('Billboard');
    tile4.addTag('Hidden');

    const result2 = ecs.queryEntities({
      has: ['Tile', 'Billboard'],
      hasnt: ['Sprite', 'Hidden'],
      persist: 'bill'
    });

    const resultSet2 = new Set([...result2]);

    expect(tile4.has('Billboard')).to.be.true();
    expect(tile3.has('Tile')).to.be.true();
    expect(resultSet2.has(tile1)).to.be.false();
    expect(resultSet2.has(tile2)).to.be.true();
    expect(resultSet2.has(tile3)).to.be.false();
    expect(resultSet2.has(tile4)).to.be.false();
    expect(resultSet2.has(tile5)).to.be.false();

  });

  lab.test('filter by updatedValues', () => {

    const ecs = new ECS.ECS();
    ecs.registerComponent('Comp1', {
      properties: {
        greeting: 'hi'
      }
    });

    ecs.tick();

    const entity1 = ecs.createEntity({
      Comp1: {}
    });

    const entity2 = ecs.createEntity({
      Comp1: {
        greeting: 'hullo'
      }
    });

    ecs.tick();
    const ticks = ecs.ticks;
    const results1 = new Set(ecs.queryEntities({ has: ['Comp1'], persist: 'test' }));
    expect(results1.has(entity1)).to.be.true();
    expect(results1.has(entity2)).to.be.true();

    entity1.Comp1.greeting = 'Gutten Tag';

    const results2 = new Set(ecs.queryEntities({ persist: 'test', updatedValues: ticks }));
    expect(results2.has(entity1)).to.be.true();
    expect(results2.has(entity2)).to.be.false();
  });

  lab.test('filter by updatedComponents', () => {

    const ecs = new ECS.ECS();
    ecs.registerComponent('Comp1', {
      properties: {
        greeting: 'hi'
      }
    });
    ecs.registerComponent('Comp2', {});

    ecs.tick();

    const entity1 = ecs.createEntity({
      Comp1: {}
    });

    const entity2 = ecs.createEntity({
      Comp1: {
        greeting: 'hullo'
      }
    });

    ecs.tick();
    const ticks = ecs.ticks;
    const results1 = new Set(ecs.queryEntities({ has: ['Comp1'], persist: 'test' }));
    expect(results1.has(entity1)).to.be.true();
    expect(results1.has(entity2)).to.be.true();

    entity1.Comp1.greeting = 'Gutten Tag';
    entity2.addComponent('Comp2', {});

    const results2 = new Set(ecs.queryEntities({ persist: 'test', updatedComponents: ticks }));
    expect(results2.has(entity1)).to.be.false();
    expect(results2.has(entity2)).to.be.true();

  });

  lab.test('destroyed entity should be cleared', () => {

    const ecs = new ECS.ECS();
    ecs.registerComponent('Comp1', {});

    const entity1 = ecs.createEntity({
      Comp1: {}
    });

    const results1 = new Set(ecs.queryEntities({ has: ['Comp1'], persist: 'test' }));
    expect(results1.has(entity1)).to.be.true();

    entity1.destroy();

    const results2 = new Set(ecs.queryEntities({ persist: 'test' }));
    expect(results2.has(entity1)).to.be.false();

  });
});


lab.experiment('entity & component refs', () => {

  const ecs = new ECS.ECS();

  lab.test('Enitity Object', {}, () => {

    ecs.registerComponent('BeltSlots', {
      properties: {
        slots: '<EntityObject>',
      }
    });
    ecs.registerComponent('Potion', {});

    const belt = ecs.createEntity({
      BeltSlots: {}
    });

    const slots = ['a', 'b', 'c'];
    const potions = [];
    for (const slot of slots) {
      const potion = ecs.createEntity({
        Potion: {}
      });
      belt.BeltSlots.slots[slot] = potion;
      potions.push(potion);
    }

    const potionf = ecs.createEntity({
      Potion: {}
    });

    expect(belt.BeltSlots.slots[Symbol.iterator]).to.not.exist();

    expect(belt.BeltSlots.slots.a).to.equal(potions[0]);
    expect(belt.BeltSlots.slots.b).to.equal(potions[1]);
    expect(belt.BeltSlots.slots.c).to.equal(potions[2]);

    potions[1].destroy();
    expect(belt.BeltSlots.slots.b).to.equal(null);

    delete belt.BeltSlots.slots.c;
    expect(belt.BeltSlots.slots.c).to.not.exist();

    //assign again
    belt.BeltSlots.slots.a = potions[0];

    //asign by id
    belt.BeltSlots.slots.a = potionf.id;
    expect(belt.BeltSlots.slots.a).to.equal(potionf);

    delete belt.BeltSlots.slots.d
  });

  lab.test('Entity Array', {}, () => {

    ecs.registerComponent('BeltSlots2', {
      properties: {
        slots: '<EntitySet>',
      }
    });

    const belt = ecs.createEntity({
      BeltSlots2: {}
    });

    const slots = ['a', 'b', 'c'];
    const potions = [];
    for (const slot of slots) {
      const potion = ecs.createEntity({
        Potion: {}
      });
      belt.BeltSlots2.slots.add(potion);
      potions.push(potion);
    }

    expect(belt.BeltSlots2.slots[Symbol.iterator]).to.exist();

    expect(belt.BeltSlots2.slots.has(potions[0])).to.be.true();
    expect(belt.BeltSlots2.slots.has(potions[1])).to.be.true();
    expect(belt.BeltSlots2.slots.has(potions[2])).to.be.true();
  });

  lab.test('Component Object', {}, () => {

    ecs.registerComponent('Crying', {});
    ecs.registerComponent('Angry', {});

    ecs.registerComponent('ExpireObject', {
      properties: {
        comps: '<ComponentObject>'
      }
    });

    const cryer = ecs.createEntity({
      Crying: {},
      Angry: {}
    });
    cryer.addComponent('ExpireObject', {});
    cryer.ExpireObject.comps.a = cryer.Crying;
    cryer.ExpireObject.comps.b = cryer.Angry.id;

    expect(cryer.ExpireObject.comps[Symbol.iterator]).to.not.exist();
    expect(cryer.ExpireObject.comps.a).to.equal(cryer.Crying);
    expect(cryer.ExpireObject.comps.b).to.equal(cryer.Angry);
    delete cryer.ExpireObject.comps.b;
    expect(cryer.ExpireObject.comps.b).to.not.exist();
    delete cryer.ExpireObject.comps.c;

  });

  lab.test('Assign entity ref by id', () => {

    ecs.registerComponent('Ref', {
      properties: {
        other: '<Entity>'
      }
    });

    const entity = ecs.createEntity({
      Crying: {}
    });

    const entity2 = ecs.createEntity({
      Ref: { other: entity.id }
    });

    expect(entity2.Ref.other).to.equal(entity);
  });

  lab.test('Reassign same entity ref', () => {

    const entity = ecs.createEntity({
      Crying: {}
    });

    const entity2 = ecs.createEntity({
      Ref: { other: entity.id }
    });

    entity2.Ref.other = entity;

    expect(entity2.Ref.other).to.equal(entity);
  });

  lab.test('Plain Component ref', () => {

    ecs.registerComponent('Mate', {
      properties: {
        other: '<Component>'
      }
    });

    const entity = ecs.createEntity({
      Crying: {},
      Mate: {}
    });

    entity.Mate.other = entity.Crying;

    expect(entity.Mate.other).to.equal(entity.Crying);
  });

  lab.test('Plain Component ref by id', () => {

    ecs.registerComponent('Mate', {
      properties: {
        other: '<Component>'
      }
    });

    const entity = ecs.createEntity({
      Crying: {},
      Mate: {}
    });

    entity.Mate.other = entity.Crying.id;

    expect(entity.Mate.other).to.equal(entity.Crying);
  });

  lab.test('ComponentSet refs', () => {

    const ecs = new ECS.ECS();
    ecs.registerComponent('IDontKnow', {
      properties: {
        stuff: '<ComponentSet>'
      }
    });
    ecs.registerComponent('Shit', {});
    ecs.registerComponent('Crap', {});

    const entity = ecs.createEntity({
      IDontKnow: {},
      Shit: {},
      Crap: {}
    });

    entity.IDontKnow.stuff.add(entity.Shit);
    entity.IDontKnow.stuff.add(entity.Crap.id);

    expect(entity.IDontKnow.stuff.has(entity.Shit)).to.be.true();
    expect(entity.IDontKnow.stuff.has(entity.Crap)).to.be.true();

    entity.IDontKnow.stuff.delete(entity.Shit.id);
    expect(entity.IDontKnow.stuff.has(entity.Shit)).to.be.false();
    expect(entity.IDontKnow.stuff.has(entity.Crap)).to.be.true();

    entity.IDontKnow.stuff.clear();
    expect(entity.IDontKnow.stuff.has(entity.Crap)).to.be.false();
    expect(entity.IDontKnow.stuff.has(entity.Shit)).to.be.false();
  });

});

lab.experiment('entity restore', () => {

  lab.test('restore maped object', {}, () => {

    const ecs = new ECS.ECS();
    ecs.registerComponent('Potion');
    ecs.registerComponent('EquipmentSlot', {
      properties: {
        name: 'finger',
        slot: '<Entity>'
      },
      multiset: true,
      mapBy: 'name'
    });


    const potion1 = ecs.createEntity({
      Potion: {}
    });
    const potion2 = ecs.createEntity({
      Potion: {}
    });

    const entity = ecs.createEntity({
      EquipmentSlot: {
        'main': { slot: potion1 },
        'secondary': { slot: potion2 }
      }
    });

    expect(entity.EquipmentSlot.main.slot).to.equal(potion1);
    expect(entity.EquipmentSlot.secondary.slot).to.equal(potion2);
    expect(potion1).to.not.equal(potion2);
  });

  lab.test('restore unmapped object', {}, () => {

    const ecs = new ECS.ECS();
    ecs.registerComponent('Potion');
    ecs.registerComponent('EquipmentSlot', {
      properties: {
        name: 'finger',
        slot: '<Entity>'
      },
      multiset: true
    });


    const potion1 = ecs.createEntity({
      Potion: {}
    });
    const potion2 = ecs.createEntity({
      Potion: {}
    });
    const potion3 = ecs.createEntity({
      Potion: {}
    });

    const entity = ecs.createEntity({
      EquipmentSlot: [
        { name: 'slot1', slot: potion1 },
        { name: 'slot2', slot: potion2 }
      ]
    });
    entity.addComponent('EquipmentSlot', {
      name: 'slot3',
      slot: potion3
    });

    const slots = [...entity.EquipmentSlot]

    expect(slots[0].slot).to.equal(potion1);
    expect(slots[0].name).to.equal('slot1');
    expect(slots[1].slot).to.equal(potion2);
    expect(slots[1].name).to.equal('slot2');
    expect(slots[2].slot).to.equal(potion3);
    expect(slots[2].name).to.equal('slot3');
  });

  lab.test('2nd component on non-multiset component throws', { plan: 1 }, () => {

    const ecs = new ECS.ECS();
    ecs.registerComponent('Potion');

    const entity = ecs.createEntity({
      Potion: {}
    });

    try {
      entity.addComponent('Potion', {});
    } catch (err) {
      expect(err).to.be.an.error();
    }
  });

  lab.test('Unregistered component throws', { plan: 1 }, () => {

    const ecs = new ECS.ECS();
    ecs.registerComponent('Potion');

    let entity;
    try {
      entity = ecs.createEntity({
        Posion: {} //misspelled
      });
    } catch (err) {
      expect(err).to.be.an.error();
    }
  });

  lab.test('removeComponentByType single', () => {
    const ecs = new ECS.ECS();
    ecs.registerComponent('NPC');
    ecs.registerComponent('Cat');

    const entity = ecs.createEntity({
      NPC: {},
      Cat: {}
    });

    expect(entity.Cat).to.exist();

    entity.removeComponentByType('Cat');
    expect(entity.Cat).to.not.exist();

    entity.removeComponentByType('Cat');
    expect(entity.Cat).to.not.exist();

  });

  lab.test('removeComponentByName multiset', () => {

    const ecs = new ECS.ECS();
    ecs.registerComponent('NPC');
    ecs.registerComponent('Other', {
      multiset: true
    });
    ecs.registerComponent('Armor', {
      properties: { 'amount': 5 },
      multiset: true
    });

    const entity = ecs.createEntity({
      NPC: {},
      Armor: [{ amount: 10 }, { amount: 30 }]
    });
    const entity2 = ecs.createEntity({
      Other: [{}],
    });

    expect(entity.NPC).to.exist();
    expect(entity.Armor).to.exist();
    expect(entity.Armor.size).to.equal(2);
    expect([...entity.Armor][0].amount).to.equal(10);
    expect([...entity.Armor][1].amount).to.equal(30);

    entity.removeComponentByType('Armor');
    expect(entity.Armor).to.not.exist();

    entity.removeComponent([...entity2.Other][0]);
  });

  lab.test('remove mapped by id', () => {

    const ecs = new ECS.ECS();
    ecs.registerComponent('NPC');

    const entity = ecs.createEntity({
      NPC: {}
    });
    const id = entity.NPC.id;
    entity.removeComponent(id);

    expect(entity.NPC).to.not.exist();
  });

  lab.test('remove mapped component', () => {
    const ecs = new ECS.ECS();
    ecs.registerComponent('AI', {
      properties: {
        order: 'sun'
      },
      multiset: true,
      mapBy: 'order'
    });
    ecs.registerComponent('EquipmentSlot', {
      properties: {
        name: 'mainhand',
        slot: '<Entity>'
      },
      multiset: true,
      mapBy: 'name'
    });

    const entity = ecs.createEntity({
      EquipmentSlot: {
        righthand: {},
        lefthand: {}
      }
    });

    const entity2 = ecs.createEntity({
      AI: {
        sun: {},
        moon: {}
      },
      EquipmentSlot: {
        righthand: {},
        lefthand: {}
      }
    });

    expect(entity.EquipmentSlot.righthand).to.exist();
    expect(entity.EquipmentSlot.righthand.name).to.equal('righthand');
    expect(entity.EquipmentSlot.lefthand.name).to.equal('lefthand');

    entity.removeComponent(entity.EquipmentSlot.righthand);

    expect(entity.EquipmentSlot.righthand).to.not.exist();

    entity.removeComponent(entity2.EquipmentSlot.lefthand);

    expect(entity.EquipmentSlot.lefthand).to.exist();
    expect(entity2.EquipmentSlot.righthand).to.exist();

    entity.removeComponent(entity2.EquipmentSlot.righthand);

    expect(entity.EquipmentSlot.righthand).to.not.exist();
    expect(entity2.EquipmentSlot.righthand).to.exist();

    entity.removeComponent(entity2.AI.sun);

    expect(entity.EquipmentSlot.lefthand).to.exist();
    expect(entity2.AI.sun).to.exist();

    entity.removeComponent(entity.EquipmentSlot.lefthand);

    expect(entity.EquipmentSlot).to.not.exist();

  });

  lab.test('EntitySet', () => {

    const ecs = new ECS.ECS();
    ecs.registerComponent('SetInventory', {
      properties: {
        slots: '<EntitySet>'
      }
    })
    ecs.registerComponent('Bottle', {
     properties: {
      }
    })

    const container = ecs.createEntity({
      SetInventory: {},
    });

    const bottle1 = ecs.createEntity({
      Bottle: {}
    });
    const bottle2 = ecs.createEntity({
      Bottle: {}
    });
    const bottle3 = ecs.createEntity({
      Bottle: {}
    });

    container.SetInventory.slots.add(bottle1);
    container.SetInventory.slots.add(bottle2);

    expect(container.SetInventory.slots.has(bottle1.id)).to.be.true();
    expect(container.SetInventory.slots.has(bottle2)).to.be.true();
    expect(container.SetInventory.slots.has(bottle3)).to.be.false();

    const def = container.getObject();
    const defS = JSON.stringify(def);
    const def2 = JSON.parse(defS);
    delete def2.id;

    const container2 = ecs.createEntity(def2);
    expect(container2.SetInventory.slots.has(bottle1)).to.be.true();
    expect(container2.SetInventory.slots.has(bottle2)).to.be.true();
    expect(container2.SetInventory.slots.has(bottle3)).to.be.false();

    let idx = 0;
    for (const entity of container2.SetInventory.slots) {
      if (idx === 0) {
        expect(entity).to.equal(bottle1);
      } else if (idx === 1) {
        expect(entity).to.equal(bottle2);
      }
      idx++;
    }
    expect(idx).to.equal(2);

    expect(container2.SetInventory.slots.has(bottle1)).to.be.true();
    bottle1.destroy();
    expect(container2.SetInventory.slots.has(bottle1)).to.be.false();
    expect(container2.SetInventory.slots.has(bottle2)).to.be.true();
    container2.SetInventory.slots.delete(bottle2.id);
    expect(container2.SetInventory.slots.has(bottle2)).to.be.false();

    expect(container.SetInventory.slots.has(bottle1)).to.be.false();
    expect(container.SetInventory.slots.has(bottle2)).to.be.true();

    container.SetInventory.slots.clear()
    expect(container.SetInventory.slots.has(bottle2)).to.be.false();

  });

});

lab.experiment('exporting and restoring', () => {

  lab.test('get object and stringify component', () => {

    const ecs = new ECS.ECS();
    ecs.registerComponent('AI', {
      properties: {
        order: 'sun'
      },
      multiset: true,
      mapBy: 'order'
    });

    const entity = ecs.createEntity({
      AI: [{ order: 'moon' }, { order: 'jupiter' }]
    });

    const obj = JSON.parse(entity.AI.moon.stringify());

    expect(obj.type).to.equal('AI');
    expect(obj.id).to.equal(entity.AI.moon.id);
  });

  lab.test('getObject on entity', () => {

    const ecs = new ECS.ECS();
    ecs.registerComponent('EquipmentSlot', {
      properties: {
        name: 'ring',
        slot: '<Entity>'
      },
      multiset: true,
      mapBy: 'name'
    });
    ecs.registerComponent('Bottle', {});
    ecs.registerComponent('AI', {});
    ecs.registerComponent('Effect', {
      properties: {
        name: 'fire'
      },
      multiset: true
    });

    const bottle = ecs.createEntity({ Bottle: {} });
    let npc = ecs.createEntity({
      EquipmentSlot: {
        ring: { slot: bottle }
      },
      Effect: [{ name: 'wet' }, { name: 'annoyed' }],
      AI: {}
    });

    const old = npc.getObject();

    npc.destroy();
    npc = undefined;

    npc = ecs.createEntity(old);

    const old2 = npc.getObject();

    expect(npc.EquipmentSlot.ring.slot).to.equal(bottle);
    expect(npc.Effect.size).to.equal(2);
    expect([...npc.Effect][0].name).to.equal('wet');
    expect([...npc.Effect][1].name).to.equal('annoyed');
    expect([...npc.Effect][1].id).to.equal(old.Effect[1].id);
    expect([...npc.Effect][0].id).to.equal(old.Effect[0].id);
    expect(npc.AI.id).to.equal(old.AI.id);
  });

  lab.test('property skipping', () => {

    const ecs = new ECS.ECS();
    ecs.registerComponent('Effect', {
      properties: {
        name: 'fire',
        started: ''
      },
      serialize: {
        skip: false,
        ignore: ['started']
      }
    });
    ecs.registerComponent('AI', {
      properties: {
        name: 'thingy',
      },
      serialize: {
        skip: true,
        ignore: []
      }
    });

    ecs.registerComponent('Liquid', {
      properties: {},
      serialize: {
        ignore: []
      }
    });

    const entity = ecs.createEntity({
      Effect: {
        name: 'fire',
        started: Date.now()
      },
      AI: {},
      Liquid: {}
    });

    const old = entity.getObject();

    const entity2 = ecs.createEntity(old);

    expect(old.AI).to.not.exist();
    expect(old.Effect.started).to.not.exist();
    expect(old.Effect.name).to.equal('fire');
    expect(old.Liquid).to.exist();
    expect(entity2.Liquid).to.exist();
  });
});
