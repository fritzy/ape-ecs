const { expect } = require('@hapi/code');
const Lab = require('@hapi/lab');
const lab = exports.lab = Lab.script();
const ECS = require('../src/index');
const {
  EntityRef,
  ComponentRef,
  EntitySet,
  EntityObject,
  ComponentSet,
  ComponentObject
} = require('../src/componentrefs');

lab.experiment('express components', () => {

  const ecs = new ECS.World();
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
      Health: { hp: 10 }
    });

    const results = ecs.createQuery({ all: ['Health'] }).execute();

    expect(results.size).to.equal(1);
  });

  lab.test('create 2nd entity', () => {

    ecs.createEntity({
      Health: { hp: 10 }
    });

    const results = ecs.createQuery().fromAll(['Health']).execute();

    expect(results.size).to.equal(2);
  });

  lab.test('entity refs', () => {

    ecs.registerComponent('Storage', {
      properties: {
        name: 'inventory',
        size: 20,
        items: EntitySet
      },
      many: true,
      mapBy: 'name'
    });

    ecs.registerComponent('EquipmentSlot', {
      properties: {
        name: 'finger',
        slot: EntityRef,
        effects: []
      },
      many: true,
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
      pockets: { type: 'Storage', size: 4 },
      backpack: { type: 'Storage', size: 25 },
      pants: { type: 'EquipmentSlot' },
      shirt: { type: 'EquipmentSlot' },
      Health: {
        hp: 10,
        max: 10
      }
    });

    entity.component.pockets.items.add(food);
    expect(entity.component.pockets.items.has(food)).to.be.true();

    const entityObj = entity.getObject(false);
    delete entityObj.id;
    const eJson = JSON.stringify(entityObj);
    const entityDef = JSON.parse(eJson);

    const entity2 = ecs.createEntity(entityDef);

    expect(entity.component.pockets.items.has(food)).to.be.true();
    expect(entity2.component.pockets.items.has(food)).to.be.true();

    ecs.removeEntity(food);

    expect(entity.component.pockets.items.has(food)).to.be.false();
    expect(entity2.component.pockets.items.has(food)).to.be.false();

    expect(ecs.getEntity(food.id)).to.be.undefined();
    ecs.removeEntity(entity.id);

    expect(ecs.getEntity(entity.id)).to.be.undefined();

  });

  lab.test('init and destroy component', () => {

    let hit = false;

    const ecs = new ECS.World();
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


    expect(entity.component.Test.y).to.equal(1);
    expect(hit).to.equal(false);

    entity.removeComponent(entity.component.Test);
    expect(hit).to.equal(true);

  });

  lab.test('system subscriptions', () => {

    let changes = [];
    let changes2 = [];
    let effectExt = null;
    /* $lab:coverage:off$ */
    class System extends ECS.System {

      constructor(world) {

        super(world);
        this.world.subscribe(this, 'EquipmentSlot');
      }

      update(tick) {

        changes = this.changes;
        for (const change of this.changes) {
          const parent = this.world.getEntity(change.entity);
          if (change.op === 'addRef') {
            const value = this.world.getEntity(change.target);
            if (value.has('Wearable')) {
              const components = [];
              for (const ctype of Object.keys(value.c.Wearable.effects)) {
                const component = parent.addComponent(ctype, value.c.Wearable.effects[ctype], '*');
                components.push(component);
              }
              if (components.length > 0) {
                const effect = parent.addComponent('EquipmentEffect', { equipment: value.id }, '*');
                for (const c of components) {
                  effect.effects.push(c.id);
                  effectExt = c;
                }
              }
            }
          } else if (change.op === 'deleteRef') {
            for (const effect of parent.getComponents('EquipmentEffect')) {
              if (effect.equipment === change.target) {
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

    class System2 extends ECS.System {

      constructor(world) {

        super(world);
        //this.world.subscribe(this, 'EquipmentSlot');
      }

      update(tick) {

        changes2 = this.changes;
      }
    }
    System2.subscriptions = ['EquipmentSlot'];
    /* $lab:coverage:on */

    ecs.registerComponent('EquipmentEffect', {
      properties: {
        equipment: '',
        effects: []
      },
      many: true
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
      pockets: { type: 'Storage', size: 4 },
      backpack: { type: 'Storage', size: 25 },
      pants: { type: 'EquipmentSlot' },
      shirt: { type: 'EquipmentSlot' },
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
    expect(changes.length).to.equal(2);

    entity.c.pants.slot = pants;

    ecs.runSystemGroup('equipment');

    expect(entity.getComponents('EquipmentEffect')).to.exist();
    const eEffects = new Set([...entity.getComponents('EquipmentEffect')][0].effects);

    expect(eEffects.has(effectExt.id)).to.be.true();
    expect(entity.getComponents('Burning')).to.exist();
    expect(changes.length).to.equal(1);
    expect(changes[0].op).to.equal('addRef');
    expect(changes[0].target).to.equal(pants.id);

    //entity.EquipmentSlot.pants.slot = null;
    pants.destroy();
    ecs.runSystemGroup('equipment');

    ecs.runSystemGroup('asdf'); //code path for non-existant system
    expect(changes2.length).to.be.greaterThan(0);
    expect(changes.length).to.be.greaterThan(0);
    expect(changes[0].target).to.equal(pants.id);
    expect(entity.getComponents('EquipmentEffect')).to.not.exist();
    expect(entity.getComponents('Burning')).to.not.exist();

  });

});

lab.experiment('system queries', () => {

  const ecs = new ECS.World();

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

      constructor(world) {

        super(world);
        this.lastResults = [];
        this.query = this.world.createQuery({
          all: 'Tile',
          not: ['Hidden'],
          index: this });
      }

      update(tick) {

        this.lastResults = this.query.execute();
      }
    }

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

    ecs.tick()

    ecs.runSystemGroup('map');

    expect(tileSystem.lastResults.size).to.equal(1);
    expect(tileSystem.lastResults.has(tile1)).to.be.true();

    tile2.removeComponent(tile2.c.Hidden);
    ecs.tick();

    ecs.runSystemGroup('map');

    expect(tileSystem.lastResults.size).to.equal(2);
    expect(tileSystem.lastResults.has(tile1)).to.be.true();
    expect(tileSystem.lastResults.has(tile1)).to.be.true();

    tile1.addComponent('Hidden', {});
    ecs.updateIndexes(tile1);

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

    const result = ecs.createQuery()
      .fromAll(['Tile', 'Billboard'])
      .not(['Sprite', 'Hidden'])
      .execute();

    const resultSet = new Set([...result]);

    expect(resultSet.has(tile1)).to.be.false();
    expect(resultSet.has(tile2)).to.be.true();
    expect(resultSet.has(tile3)).to.be.false();
    expect(resultSet.has(tile4)).to.be.false();
    expect(resultSet.has(tile5)).to.be.false();

  });

  lab.test('tags', () => {

    const ecs = new ECS.World();
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

    const result = ecs.createQuery({
      all: ['Tile', 'Billboard'],
      not: ['Sprite', 'Hidden'],
    }).index('bill').execute();

    const resultSet = new Set([...result]);

    expect(resultSet.has(tile1)).to.be.false();
    expect(resultSet.has(tile2)).to.be.true();
    expect(tile2.has('Sprite')).to.be.false();
    expect(resultSet.has(tile3)).to.be.false();
    expect(resultSet.has(tile4)).to.be.false();
    expect(resultSet.has(tile5)).to.be.false();

    const result3 = ecs.getEntities('Hidden');

    expect(result3.has(tile1)).to.be.true();
    expect(result3.has(tile2)).to.be.false();
    expect(result3.has(tile3)).to.be.false();
    expect(result3.has(tile4)).to.be.false();
    expect(result3.has(tile5)).to.be.false();

    tile4.addTag('Billboard');
    tile2.removeTag('Hidden');
    tile1.removeTag('Hidden');
    tile3.addComponent('Tile', {});
    tile3.addTag('Hidden');
    tile1.removeTag('Billboard');
    tile4.addTag('Hidden');

    const result2 = ecs.queryIndexes.get('bill').results;

    expect(tile4.has('Billboard')).to.be.true();
    expect(tile3.has('Tile')).to.be.true();
    expect(result2.has(tile1)).to.be.false();
    expect(result2.has(tile2)).to.be.true();
    expect(result2.has(tile3)).to.be.false();
    expect(result2.has(tile4)).to.be.false();
    expect(result2.has(tile5)).to.be.false();

  });

  lab.test('filter by updatedValues', () => {

    const ecs = new ECS.World();
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
    const testQ = ecs.createQuery().fromAll(['Comp1']).index('test');
    const results1 = testQ.execute();
    expect(results1.has(entity1)).to.be.true();
    expect(results1.has(entity2)).to.be.true();

    const comp1 = entity1.getComponent('Comp1');
    comp1.greeting = 'Gutten Tag';

    const results2 = testQ.execute({updatedValues: ticks});
    expect(results2.has(entity1)).to.be.true();
    expect(results2.has(entity2)).to.be.false();
  });

  lab.test('filter by updatedComponents', () => {

    const ecs = new ECS.World();
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
    const testQ = ecs.createQuery().fromAll('Comp1').index('test');
    const results1 = testQ.execute();
    expect(results1.has(entity1)).to.be.true();
    expect(results1.has(entity2)).to.be.true();

    const comp1 = entity1.getComponent('Comp1');
    comp1.greeting = 'Gutten Tag';
    entity2.addComponent('Comp2', {});

    const results2 = testQ.execute({ updatedComponents: ticks });
    expect(results2.has(entity1)).to.be.false();
    expect(results2.has(entity2)).to.be.true();

  });

  lab.test('destroyed entity should be cleared', () => {

    const ecs = new ECS.World();
    ecs.registerComponent('Comp1', {});

    const entity1 = ecs.createEntity({
      Comp1: {}
    });

    const query = ecs.createQuery().fromAll('Comp1').index('test');
    const results1 = query.execute();
    expect(results1.has(entity1)).to.be.true();

    entity1.destroy();

    ecs.tick();

    const results2 = query.execute();
    expect(results2.has(entity1)).to.be.false();

  });
});


lab.experiment('entity & component refs', () => {

  const ecs = new ECS.World();

  ecs.registerComponent('BeltSlots', {
    properties: {
      slots: EntityObject,
    }
  });
  ecs.registerComponent('Potion', {});

  lab.test('Entity Object', {}, () => {

    const belt = ecs.createEntity({
      BeltSlots: {}
    });

    const slots = ['a', 'b', 'c'];
    const potions = [];
    const beltslots = belt.getComponent('BeltSlots');
    for (const slot of slots) {
      const potion = ecs.createEntity({
        Potion: {}
      });
      beltslots.slots[slot] =  potion;
      potions.push(potion);
    }

    const potionf = ecs.createEntity({
      Potion: {}
    });

    //expect(beltslots.slots[Symbol.iterator]).to.not.exist();

    expect(beltslots.slots.a).to.equal(potions[0]);
    expect(beltslots.slots.b).to.equal(potions[1]);
    expect(beltslots.slots.c).to.equal(potions[2]);

    potions[1].destroy();
    expect(beltslots.slots.b).to.not.exist();

    delete beltslots.slots.c;
    expect(beltslots.slots.c).to.not.exist();

    //assign again
    beltslots.slots['a'] = potions[0];

    //asign by id
    beltslots.slots.a = potionf.id;
    expect(beltslots.slots.a).to.equal(potionf);

    delete beltslots.slots.d;
  });

  lab.test('Entity Set', {}, () => {

    ecs.registerComponent('BeltSlots2', {
      properties: {
        slots: EntitySet,
      }
    });

    const belt = ecs.createEntity({
      BeltSlots2: {}
    });

    const slots = ['a', 'b', 'c'];
    const potions = [];
    const beltSlots2 = belt.getComponent('BeltSlots2');
    for (const slot of slots) {
      const potion = ecs.createEntity({
        Potion: {}
      });
      beltSlots2.slots.add(potion);
      potions.push(potion);
    }

    expect(beltSlots2.slots[Symbol.iterator]).to.exist();

    expect(beltSlots2.slots.has(potions[0])).to.be.true();
    expect(beltSlots2.slots.has(potions[1])).to.be.true();
    expect(beltSlots2.slots.has(potions[2])).to.be.true();

    const withValues = ecs.createEntity({
      BeltSlots: { slots: { a: potions[0].id, b: potions[2], d: null }}
    });

    expect(withValues.c.BeltSlots.slots.a).to.equal(potions[0]);
    expect(withValues.c.BeltSlots.slots.b).to.equal(potions[2]);

    withValues.c.BeltSlots.slots.c = potions[1].id;
    expect(withValues.c.BeltSlots.slots.c).to.equal(potions[1]);

    withValues.c.BeltSlots.slots.c = null;
    expect(withValues.c.BeltSlots.slots.c).to.equal(undefined);
    withValues.c.BeltSlots.slots.c = potions[1];
    expect(withValues.c.BeltSlots.slots.c).to.equal(potions[1]);


  });

  ecs.registerComponent('Crying', {});
  ecs.registerComponent('Angry', {});

  lab.test('Assign entity ref by id', () => {

    ecs.registerComponent('Ref', {
      properties: {
        other: EntityRef
      }
    });

    const entity = ecs.createEntity({
      Crying: {}
    });

    const entity2 = ecs.createEntity({
      Ref: { other: entity.id }
    });

    expect(entity2.c.Ref.other).to.equal(entity);
  });

  lab.test('Reassign same entity ref', () => {

    const entity = ecs.createEntity({
      Crying: {}
    });

    const entity2 = ecs.createEntity({
      Ref: { other: entity.id }
    });

    const ref2 = entity2.getComponent('Ref');
    ref2.other = entity;

    expect(ref2.other).to.equal(entity);
  });

});

lab.experiment('entity restore', () => {

  lab.test('restore mapped object', {}, () => {

    const ecs = new ECS.World();
    ecs.registerTags(['Potion']);
    ecs.registerComponent('EquipmentSlot', {
      properties: {
        name: 'finger',
        slot: EntityRef
      }
    });


    const potion1 = ecs.createEntity({
      tags: ['Potion']
    });
    const potion2 = ecs.createEntity({
      tags: ['Potion']
    });

    const entity = ecs.createEntity({
      'main': { slot: potion1, type: 'EquipmentSlot' },
      'secondary': { slot: potion2, type: 'EquipmentSlot' }
    });

    expect(entity.c.main.slot).to.equal(potion1);
    expect(entity.c.secondary.slot).to.equal(potion2);
    expect(potion1).to.not.equal(potion2);
  });

  lab.test('restore unmapped object', {}, () => {

    const ecs = new ECS.World();
    ecs.registerTags('Potion');
    ecs.registerComponent('EquipmentSlot', {
      properties: {
        name: 'finger',
        slot: EntityRef
      },
      many: true
    });


    const potion1 = ecs.createEntity({
      tags: ['Potion']
    });
    const potion2 = ecs.createEntity({
      tags: ['Potion']
    });
    const potion3 = ecs.createEntity({
      tags: ['Potion']
    });

    const entity = ecs.createEntity({
      slot1: { type: 'EquipmentSlot', name: 'slot1', slot: potion1 },
      slot2: { type: 'EquipmentSlot', name: 'slot2', slot: potion2 }
    });
    entity.addComponent('EquipmentSlot', {
      name: 'slot3',
      slot: potion3
    }, 'slot3');


    expect(entity.c.slot1.slot).to.equal(potion1);
    expect(entity.c.slot1.name).to.equal('slot1');
    expect(entity.c.slot2.slot).to.equal(potion2);
    expect(entity.c.slot2.name).to.equal('slot2');
    expect(entity.c.slot3.slot).to.equal(potion3);
    expect(entity.c.slot3.name).to.equal('slot3');
  });

  lab.test('Unregistered component throws', { plan: 1 }, () => {

    const ecs = new ECS.World();
    ecs.registerComponent('Potion', {});

    let entity;
    try {
      entity = ecs.createEntity({
        Posion: {} //misspelled
      });
    } catch (err) {
      expect(err).to.be.an.error();
    }
  });

  lab.test('Unassigned field is not set', () => {

    const ecs = new ECS.World();
    ecs.registerComponent('Potion', {
      properties: {}
    });
    const entity = ecs.createEntity({ Potion: { x: 37 } });
    expect(entity.c.Potion.x).to.be.undefined();

  });

  lab.test('removeComponentByName many', () => {

    const ecs = new ECS.World();
    ecs.registerComponent('NPC', {});
    ecs.registerComponent('Other', {});
    ecs.registerComponent('Armor', {
      properties: { 'amount': 5 },
    });

    const entity = ecs.createEntity({
      NPC: {},
    });
    entity.addComponent('Armor', { amount: 10 }, '*');
    entity.addComponent('Armor', { amount: 30 }, '*');

    const entity2 = ecs.createEntity({
      Other: {},
    });

    expect(entity.has('NPC')).to.be.true();
    expect(entity.has('Armor')).to.exist();
    const armors = entity.getComponents('Armor');
    expect(armors.size).to.equal(2);
    expect([...armors][0].amount).to.equal(10);
    expect([...armors][1].amount).to.equal(30);

    entity.removeComponent([...armors][0]);
    const armors2 = entity.getComponents('Armor');
    expect(armors2.size).to.equal(1);

    const others = entity2.getComponents('Other');
    expect(others.size).to.equal(1);
    entity2.removeComponent([...others][0]);
  });

  lab.test('EntitySet', () => {

    const ecs = new ECS.World();
    ecs.registerComponent('SetInventory', {
      properties: {
        slots: EntitySet
      }
    });
    ecs.registerComponent('Bottle', {
     properties: {
      }
    });
    ecs.registerComponent('ThrowAway', {
      properties: {
        a: 1,
      },
      serialize: { skip: true }
    });

    const container = ecs.createEntity({
      SetInventory: {},
      ThrowAway: {}
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

    const setInv = container.getComponent('SetInventory');
    setInv.slots.add(bottle1);
    setInv.slots.add(bottle2);

    expect(setInv.slots.has(bottle1.id)).to.be.true();
    expect(setInv.slots.has(bottle2)).to.be.true();
    expect(setInv.slots.has(bottle3)).to.be.false();

    const def = container.getObject(false);
    const defS = JSON.stringify(def);
    const def2 = JSON.parse(defS);
    delete def2.id;

    const container2 = ecs.createEntity(def2);
    const setInv2 = container2.getComponent('SetInventory');
    expect(setInv2.slots.has(bottle1)).to.be.true();
    expect(setInv2.slots.has(bottle2)).to.be.true();
    expect(setInv2.slots.has(bottle3)).to.be.false();
    expect(container2.c.ThrowAway).to.be.undefined();

    let idx = 0;
    for (const entity of setInv2.slots) {
      if (idx === 0) {
        expect(entity).to.equal(bottle1);
      } else if (idx === 1) {
        expect(entity).to.equal(bottle2);
      }
      idx++;
    }
    expect(idx).to.equal(2);

    expect(setInv2.slots.has(bottle1)).to.be.true();
    bottle1.destroy();
    expect(setInv2.slots.has(bottle1)).to.be.false();
    expect(setInv2.slots.has(bottle2)).to.be.true();
    setInv2.slots.delete(bottle2.id);
    expect(setInv2.slots.has(bottle2)).to.be.false();

    expect(setInv.slots.has(bottle1)).to.be.false();
    expect(setInv.slots.has(bottle2)).to.be.true();

    setInv.slots.clear()
    expect(setInv.slots.has(bottle2)).to.be.false();

    const bottle4 = ecs.createEntity({
      Bottle: {}
    });

    const bottle5 = ecs.createEntity({
      Bottle: {}
    });

    const withValues = ecs.createEntity({
      SetInventory: {
        slots: [bottle4, bottle5.id]
      }
    });

    expect(withValues.c.SetInventory.slots.has(bottle4)).to.be.true();
    expect(withValues.c.SetInventory.slots.has(bottle5)).to.be.true();

    withValues.c.SetInventory.slots._reset();
    expect(withValues.c.SetInventory.slots.has(bottle4)).to.be.true();
    expect(withValues.c.SetInventory.slots.has(bottle5)).to.be.true();


  });

});

lab.experiment('exporting and restoring', () => {

  lab.test('get object and stringify component', () => {

    const ecs = new ECS.World();
    ecs.registerComponent('AI', {
      properties: {
        order: 'sun'
      },
    });

    const entity = ecs.createEntity({
      moon: { type: 'AI', order: 'moon' },
      jupiter: { type: 'AI', order: 'jupiter' },
    });

    const moon = entity.getComponent('moon');
    const obj = moon.getObject();

    expect(obj.type).to.equal('AI');
    expect(obj.id).to.equal(moon.id);
  });

  lab.test('getObject on entity', () => {

    const ecs = new ECS.World();
    ecs.registerComponent('EquipmentSlot', {
      properties: {
        name: 'ring',
        slot: EntityRef
      },
    });
    ecs.registerComponent('Bottle', {});
    ecs.registerComponent('AI', {});
    ecs.registerComponent('Effect', {
      properties: {
        name: 'fire'
      },
    });

    const bottle = ecs.createEntity({ Bottle: {} });
    let npc = ecs.createEntity({
      ring: { type: 'EquipmentSlot', slot: bottle },
      AI: {}
    });
    npc.addComponent('Effect', { name: 'wet' }, '*');
    npc.addComponent('Effect', { name: 'annoyed' }, '*');

    const old = npc.getObject();

    expect(old.ring.slot).to.equal(bottle.id);

    npc.destroy();
    npc = undefined;

    npc = ecs.createEntity(old);

    const old2 = npc.getObject();

    const ring = npc.getComponent('ring');
    expect(ring.slot).to.equal(bottle);
    const effect = npc.getComponents('Effect');
    expect(effect.size).to.equal(2);
    expect([...effect][0].name).to.equal('wet');
    expect([...effect][1].name).to.equal('annoyed');
  });

  lab.test('property skipping', () => {

    const ecs = new ECS.World();
    ecs.registerComponent('Effect', {
      properties: {
        name: 'fire',
        started: ''
      },
      serialize: {
        skip: false,
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
    //expect(old.Effect.started).to.not.exist();
    expect(old.Effect.name).to.equal('fire');
    expect(old.Liquid).to.exist();
    expect(entity2.getComponent('Liquid')).to.exist();
  });

});

lab.experiment('advanced queries', () => {
  lab.test('from and reverse queries', () => {

    const ecs = new ECS.World();

    ecs.registerTags(['A', 'B', 'C']);

    const entity1 = ecs.createEntity({
      tags: ['A']
    });
    const entity2 = ecs.createEntity({
      tags: ['B']
    });

    const entity3 = ecs.createEntity({
      tags: ['B', 'C']
    });

    const entity4 = ecs.createEntity({
      tags: ['B', 'C', 'A']
    });

    const q = ecs.createQuery({ from: [entity1, entity2, entity3] });
    const r = q.execute();

    expect(r.has(entity1)).to.be.true();
    expect(r.has(entity2)).to.be.true();
    expect(r.has(entity3)).to.be.true();

    ecs.registerComponent('Person', {
      properties: {
        name: 'Bill'
      }
    });
    ecs.registerComponent('Item', {
      properties: {
        name: 'knife'
      }
    });

    ecs.registerComponent('InInventory', {
      properties: {
        person: EntityRef
      }
    });

    const e4 = ecs.createEntity({
      Person: {
        name: 'Bob'
      }
    });

    const e5 = ecs.createEntity({
      Item: {
        name: 'plate'
      },
      InInventory: {
        person: e4
      }
    });

    const q2 = ecs.createQuery({ reverse: { entity: e4, type: 'InInventory'}, index: 'reverse-1' } );
    const r2 = q2.execute();

    expect(r2.size).to.equal(1);
    expect(r2.has(e5)).to.be.true();

    const q3 = ecs.createQuery({ any: ['B', 'C'], index: 'bc' });
    const r3 = q3.execute();

    const q4 = ecs.createQuery({ all: ['B', 'C'], index: 'all-bc' });
    const r3b = q4.execute();

    expect(r3.size).to.equal(3);
    expect(r3.has(entity2)).to.be.true();
    expect(r3.has(entity3)).to.be.true();
    expect(r3b.size).to.equal(2);
    expect(r3b.has(entity3)).to.be.true();
    expect(r3b.has(entity4)).to.be.true();

    e5.addTag('A');
    ecs.tick();

    entity2.removeTag('B');
    e5.removeComponent('InInventory');

    ecs.tick();
    const r4 = q3.execute();
    expect(r3.size).to.equal(2);
    expect(r3.has(entity2)).to.be.false();
    expect(r3.has(entity3)).to.be.true();

    const q2r2 = q2.execute();
    expect(q2r2.size).to.equal(0);

    const r5 = q4.execute();
    expect(r5.size).to.equal(2);
  });
});
