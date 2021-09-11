"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const src_1 = require("../src");
const ECS = {
    World: src_1.World,
    System: src_1.System,
    Component: src_1.Component,
    EntityComponent: src_1.EntityComponent
};
describe('express components', () => {
    class Health extends ECS.Component {
    }
    Health.properties = {
        max: 10,
        hp: 10,
        armor: 5
    };
    Health.typeName = 'Health';
    class Armor extends ECS.Component {
    }
    Armor.properties = {
        name: 'chestplate',
        ac: 5
    };
    const ecs = new ECS.World();
    ecs.registerComponent(Health);
    ecs.registerComponent(Armor);
    it('create entity', () => {
        const S1 = class System extends ECS.System {
        };
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
        (0, chai_1.expect)(e1.c.Health[0].hp).to.equal(10);
        const results = s1.createQuery({ all: ['Health'] }).run();
        (0, chai_1.expect)(results.size).to.equal(1);
    });
    it('create 2nd entity', () => {
        ecs.createEntity()
            .addComponent('Health', { hp: 10 });
        const results = ecs.createQuery({ all: [Health] }).run();
        (0, chai_1.expect)(results.size).to.equal(2);
        const results2 = ecs.createQuery({ any: [Health], not: ['Armor'] }).run();
        (0, chai_1.expect)(results2.size).to.equal(1);
    });
    it('init and destroy component', () => {
        let hit = false;
        const ecs = new ECS.World({ newRegistry: true });
        class Test extends ECS.Component {
            destroy() {
                this.x = null;
                hit = true;
            }
            init() {
                this.y = 1;
            }
        }
        Test.properties = {
            x: null,
            y: 2
        };
        ecs.registerComponent(Test);
        const entity = ecs.createEntity()
            .addComponent('Test', { key: 'Test' });
        (0, chai_1.expect)(entity.c.Test.Test.y).to.equal(1);
        (0, chai_1.expect)(hit).to.equal(false);
        entity.removeComponent(entity.Test.Test);
        (0, chai_1.expect)(hit).to.equal(true);
    });
});
describe('reverse query', () => {
    class Weapon extends ECS.Component {
    }
    Weapon.properties = new Set(['name', 'damage']);
    class Player extends ECS.Component {
    }
    Player.properties = new Set(['name']);
    class EquipmentSlot extends ECS.EntityComponent {
    }
    EquipmentSlot.properties = new Set(['name']);
    const ecs = new ECS.World();
    ecs.registerComponent(Weapon);
    ecs.registerComponent(Player);
    ecs.registerComponent(EquipmentSlot);
    it('can reverse query', () => {
        const sword = ecs.createEntity({ Weapon: { sword: {} } });
        const player = ecs.createEntity({});
        player.addComponent(Player, {});
        player.addComponent(EquipmentSlot, { key: 'leftHand' });
        player.EquipmentSlot.leftHand.link = sword;
        (0, chai_1.expect)(player.c.EquipmentSlot.leftHand.linkId).to.equal(sword.id);
        (0, chai_1.expect)(sword.links).includes(player.c.EquipmentSlot.leftHand, 'links work');
        const results = ecs.createQuery().fromReverse(sword, EquipmentSlot).run();
        (0, chai_1.expect)(results).includes(player, 'reverse includes player');
        (0, chai_1.expect)(results.size).to.equal(1);
        player.c.EquipmentSlot.leftHand.key = 'offHand';
        (0, chai_1.expect)(sword.links).includes(player.c.EquipmentSlot.offHand, 'links work');
        const q2 = ecs.createQuery().fromReverse(sword, EquipmentSlot);
        const results2 = q2.run();
        (0, chai_1.expect)(results2).includes(player, 'reverse includes player');
        (0, chai_1.expect)(results2.size).to.equal(1);
        player.c.EquipmentSlot.offHand.link = undefined;
        const q3 = ecs.createQuery().fromReverse(sword, EquipmentSlot);
        const results3 = q3.run();
        (0, chai_1.expect)(results3).not.includes(player, 'reverse does not includes player');
        (0, chai_1.expect)(results3.size).to.equal(0);
    });
    it('bad query', () => {
        (0, chai_1.expect)(() => ecs.createQuery({ all: ['EquipmentSlot', 'NonExistant'] })).to.throw('Unregistered type: NonExistant');
    });
});
describe('system queries', () => {
    const world = new ECS.World({ newRegistry: true });
    class EquipmentSystem extends ECS.System {
        init() {
        }
        update(tick) {
        }
    }
    class EquipmentSlot extends ECS.EntityComponent {
    }
    EquipmentSlot.properties = {};
    world.registerSystem('equipment', EquipmentSystem);
    world.registerComponent(EquipmentSlot);
    it('persistent query', () => {
    });
});
//# sourceMappingURL=index.js.map
