
import { expect } from 'chai';

import {
  System,
  World,
  Component,
  Entity,
  EntityRef,
  EntitySet,
  EntityObject,
  EntityComponent,
  Query,
  BitQuery
} from '../src';
import { SSL_OP_NO_TICKET } from 'constants';

const ECS = {
  World,
  System: System,
  Component,
  EntityComponent,
  BitQuery,
};


class Health extends ECS.Component {
  static properties = {
    max: 10,
    hp: 10,
    armor: 5
  };
  static typeName = 'Health';
}
class Armor extends ECS.Component {
  static properties = {
    name: 'chestplate',
    ac: 5
  };
  static serializeFields = ['name', 'ac'];
}
class Color extends ECS.Component {
  static properties = {
    r: 255,
    g: 255,
    b: 255
  }
  static typeName = 'Colour';
}

class Colour extends ECS.Component {
  static properties = {
    r: 255,
    g: 255,
    b: 255
  }
}

describe('express components', () => {

  const ecs = new ECS.World();
  ecs.registerComponent(Health);
  ecs.registerComponent(Armor);
  ecs.registerComponent(Color);
  ecs.registerTags('NPC', 'Enemy');

  it('create entity', () => {

    const S1 = class System extends ECS.System {}
    const s1 = new S1(ecs);

    const e1 = ecs.createEntity({
      c: {
        Health: {
          Health: {
            hp: 10,
          }
        },
        Armor: {
          breastplate: {
            ac: 5
          }
        }
      }
    });

    expect(e1.has('Health')).to.equal(true);
    expect(e1.has(Health)).to.equal(true);
    expect(e1.has('ApeDestroy')).to.equal(false);
    expect(e1.c.Health[0].hp).to.equal(10);
    const results = s1.createQuery({ all: ['Health'] }).run();
    expect(results.size).to.equal(1);

    expect(() => e1.addTag('Derp')).to.throw();
    e1.addTag('NPC');
    expect(e1.has('NPC')).to.equal(true);
    e1.addTag('NPC');
    expect(e1.has('NPC')).to.equal(true);
    e1.removeTag('Enemy');
    expect(e1.has('NPC')).to.equal(true);

    expect(() => e1.addComponent('Derp', {})).to.throw();

    const e2 = ecs.createEntity({
      c: {
        Colour: [{}]
      }
    });
    expect(e2.has('Colour')).to.equal(true);
    expect(e2.has('Color')).to.equal(false);
    expect(e2.has(Color)).to.equal(true);


  });

  it('bad registrations', () => {

    const ecs = new ECS.World();
    expect(() => ecs.registerComponent(Colour)).to.throw();
    class FakeTag extends ECS.Component {};
    expect(() => ecs.registerComponent(FakeTag)).to.throw();
  });

  it('create 2nd entity', () => {
    ecs.createEntity()
      .addComponent('Health', { hp: 12 })
    const results = ecs.createQuery({ all: [Health] }).run();
    expect(results.size).to.equal(2);
    const results2 = ecs.createQuery({ any: [Health], not: ['Armor'] }).run();
    expect(results2.size).to.equal(1);
  });

  it('init and destroy component', () => {

    let hit = false;
    const ecs = new ECS.World({ newRegistry: true });
    class Test extends ECS.Component {
      static properties = {
        x: null,
        y: 2
      };

      destroy() {
        this.x = null;
        hit = true;
      }

      init() {
        this.y = 1;
      }

    }
    ecs.registerComponent(Test);
    const entity = ecs.createEntity()
      .addComponent('Test', { key: 'Test' });
    expect(entity.c.Test.Test.y).to.equal(1);
    expect(hit).to.equal(false);
    entity.removeComponent(entity.c.Test.Test);
    expect(hit).to.equal(true);

  });

  it('destroy entity', () => {
    const q1 = ecs.createQuery({ all: [Health] });
    const r1 = q1.run();
    expect(r1.size).to.equal(2);
    const q1r2 = q1.filter((e) => e.c.Health[0].hp === 12);
    expect(q1r2.size).to.equal(1);
    const e1 = r1.values().next().value;
    const q2 = ecs.createQuery({ fromSet: [e1], all: [Health] });
    const q2r1 = q2.run();
    expect(q2r1.size).to.equal(1);
    e1.destroy();
    const q2r2 = q2.run();
    expect(q2r2.size).to.equal(0);
    const r2 = q1.run();
    expect(r2.size).to.equal(1);
    const q3 = ecs.createQuery({ all: [Health], includeApeDestroy: true });
    const r3 = q3.run();
    expect(r3.size).to.equal(2);
    ecs.tick();
    const r4 = q3.run();
    expect(r4.size).to.equal(1);
    q3.clear();
    expect(q3.results.size).to.equal(0);

  });

  it('clear registry', () => {
    expect(ecs.registry.types).has.property('Health');
    ecs.registry.clear();
    expect(ecs.registry.types).has.not.property('Health');
  });

});

describe('reverse query', () => {

  class Weapon extends ECS.Component {
    static properties = {
      name: 'weapon',
      damage: 5
    }
  }
  class Player extends ECS.Component {
    static properties = {
      name: 'player',
    }
  }
  class EquipmentSlot extends ECS.EntityComponent {
    static properties = {
      name: 'leftHand'
    }
  }

  const ecs = new ECS.World( { newRegistry: true });
  ecs.registerComponent(Weapon)
  ecs.registerComponent(Player)
  ecs.registerComponent(EquipmentSlot)

  it('can reverse query', () => {
    const sword = ecs.createEntity({ Weapon: { sword: {} } });
    const sword2 = ecs.createEntity({ Weapon: { sword: {} } });
    const player = ecs.createEntity({});
    player.addComponent(Player, {});
    player.addComponent(EquipmentSlot, { key: 'leftHand' });
    player.c.EquipmentSlot.leftHand.link = sword;

    expect(player.c.EquipmentSlot.leftHand.linkId).to.equal(sword.id);
    expect(player.c.EquipmentSlot.leftHand.link.id).to.equal(sword.id);
    expect(sword.links).includes(player.c.EquipmentSlot.leftHand, 'links work')
    const results = ecs.createQuery().fromReverse(sword, EquipmentSlot).run();
    expect(results).includes(player, 'reverse includes player');
    expect(results.size).to.equal(1);

    player.c.EquipmentSlot.leftHand.key = 'offHand';
    expect(sword.links).includes(player.c.EquipmentSlot.offHand, 'links work')
    const q2 = ecs.createQuery().fromReverse(sword, EquipmentSlot);
    const results2 = q2.run();
    expect(results2).includes(player, 'reverse includes player');
    expect(results2.size).to.equal(1);

    player.c.EquipmentSlot.offHand.link = undefined;
    expect(player.c.EquipmentSlot.offHand.linkId).to.equal(undefined);
    const q3 = ecs.createQuery().fromReverse(sword, EquipmentSlot);
    const results3 = q3.run();
    expect(results3).not.includes(player, 'reverse does not includes player');
    expect(results3.size).to.equal(0);
    player.c.EquipmentSlot.offHand.linkId = sword.id;
    const r4 = q2.run();
    expect(r4).includes(player, 'reverse includes player');
    expect(r4.size).to.equal(1);

    expect(() =>
      player.c.EquipmentSlot.offHand.linkId = 'abc'
      ).throws();

    player.c.EquipmentSlot.offHand.link = sword2;
    const q4 = ecs.createQuery().fromReverse(sword2, EquipmentSlot);
    const r5 = q4.run();
    expect(r5).includes(player, 'reverse includes player');
    expect(r5.size).to.equal(1);

    sword2.destroy();
    ecs.tick();

    const r6 = q4.run();
    expect(r6.size).to.equal(0);

    const player2 = ecs.createEntity({});
    player2.addComponent(Player, {});
    player2.addComponent(EquipmentSlot, { key: 'leftHand' });
    player2.removeComponent(player2.c.EquipmentSlot.leftHand);
    expect(player2.has('EquipmentSlot')).to.equal(false);
  });

  it ('bad query', () => {
    expect(
       () => ecs.createQuery({ all: ['EquipmentSlot', 'NonExistant'] })
    ).to.throw('Unregistered type: NonExistant');
  });

});

describe('system queries', () => {
  const world = new ECS.World({ newRegistry: true });

  class EquipmentSystem extends ECS.System {

    slotsQ: BitQuery;
    lastSlots: string[];
    lastAdded: Entity[];
    lastRemoved: Entity[];


     init() {
       this.slotsQ = this.createQuery({ 
         all: [EquipmentSlot, 'NPC'], 
         trackAdded: true,
         trackRemoved: true
       });
       this.lastSlots = [];
       this.lastAdded = [];
       this.lastRemoved = [];
     }

     update(tick) {
       const slots = this.slotsQ.run();
       this.lastSlots = [...slots].map(e => e.id);
       this.lastAdded = [...this.slotsQ.added];
       this.lastRemoved = [...this.slotsQ.removed];
     }
  }
  class EquipmentSlot extends ECS.EntityComponent {
    static properties = {
      name: 'slot'
    }

    set name (v) {
      this.key = v;
    }

    get name() {
      return this.key;
    }
  }

  world.registerComponent(EquipmentSlot);
  world.registerTags('NPC', 'Enemy', 'Player');
  const equipmentSystem = new EquipmentSystem(world);

  world.registerSystem('equipment', equipmentSystem)

  it('persistent query', () => {

    const e1 = world.createEntity({
      id: '1',
      c: {
        EquipmentSlot: [
          {
            name: 'leftHand'
          },
          {
            name: 'rightHand'
          }
        ]
      }
    });
    world.tick();
    world.runSystems('equipment');
    expect(equipmentSystem.lastSlots).not.contains('1');
    expect(equipmentSystem.lastSlots.length).to.equal(0);
    e1.addTag('NPC');
    world.tick();
    world.runSystems('equipment');
    expect(equipmentSystem.lastSlots).contains('1');
    expect(equipmentSystem.lastSlots.length).to.equal(1);
    expect(equipmentSystem.lastAdded.length).to.equal(1);
    expect(equipmentSystem.lastRemoved.length).to.equal(0);
    e1.removeTag('NPC');
    world.tick();
    world.runSystems('equipment');
    expect(equipmentSystem.lastSlots).not.contains('1');
    expect(equipmentSystem.lastSlots.length).to.equal(0);
    expect(equipmentSystem.lastRemoved.length).to.equal(1);
    expect(equipmentSystem.lastAdded.length).to.equal(0);

  });
});

describe('serialize', () => {

  it('copy objects', () => {

    const ecs1 = new ECS.World({ newRegistry: true });
    const ecs2 = new ECS.World({ registry: ecs1.registry });
    expect(ecs1.registry).to.equal(ecs2.registry);

    ecs1.registerComponent(Health);
    ecs1.registerComponent(Armor);
    class Sprite extends ECS.Component {
      static properties = {
        name: 'npc10',
        sprite: null
      }
      static serialize = false;
    }
    ecs1.registerComponent(Sprite);
    ecs2.registerTags('NPC', 'Enemy')

    const e1 = ecs1.createEntity({
      tags: ['NPC'],
      c: {
        Health: [{
          max: 20,
          hp: 11
        }],
        Armor: [{
          ac: 4
        }],
      }
    });
    const e2 = ecs1.createEntity({
      tags: ['NPC', 'Enemy'],
      c: {
        Health: [{
          max: 22,
          hp: 22
        }],
        Armor: [{
          ac: 9 
        }]
      }
    });

    const eObj1 = ecs1.getObject();
    ecs2.createEntities(eObj1);

    const e3 = ecs2.getEntity(e1.id);
    expect (JSON.stringify(e1.getObject())).to.equal(JSON.stringify(e3.getObject()));

    const e4 = ecs2.getEntity(e2.id);
    expect (JSON.stringify(e2.getObject())).to.equal(JSON.stringify(e4.getObject()));

    const entities1 = ecs1.getEntities(Health);
    const entities2 = ecs2.getEntities('Health');

    expect(entities1[0].id).to.equal(entities2[0].id);
    expect(entities1[0].c.Armor[0].ac).to.equal(ecs2.getComponent(entities1[0].c.Armor[0].id).ac);

    const e5 = ecs2.createEntity({
      c: {
        Health: [{}],
        Sprite: [{}]
      }
    });
    const obj5 = e5.getObject();
    expect(obj5.c).has.property('Health');
    expect(obj5.c).has.not.property('Sprite');

  });
});

describe('pools', () => {

  it('cleans up extra from entity pool', () => {

    const world = new ECS.World({
      newRegistry: true,
      entityPool: 4
    });
    world.registerComponent(Armor);
    const entities = [];
    for (let i = 0; i < 20; i++) {
      const e = world.createEntity({
        c: { Armor: [{}] }
      });
      entities.push(e);
    }
    world.tick();
    expect(world.entityPool.targetSize).to.equal(4);
    expect(world.entityPool.pool.length).to.equal(0);
    for (let i = 0; i < 10; i++) {
      entities.pop().destroy();
    }
    world.tick();
    expect(world.entityPool.pool.length).to.be.below(5);

  });
});
