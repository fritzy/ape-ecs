const { expect } = require('@hapi/code');
const Lab = require('@hapi/lab');
const lab = exports.lab = Lab.script();

const ECS = require('../index');
const BaseSystem = require('../system');
const BaseComponent = require('../component');

lab.experiment('express components', () => {

  const ecs = new ECS();
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

    expect(results.length).to.equal(1);
  });

  lab.test('create entity without array', () => {

    ecs.createEntity({
      Health: { hp: 10 }
    });

    const results = ecs.queryEntities({ has: ['Health'] });

    expect(results.length).to.equal(2);
  });

  lab.test('entity refs', () => {

    ecs.registerComponent('Storage', {
      properties: {
        name: 'inventory',
        size: 20,
        items: '<EntityArray>'
      },
      multiset: true,
      mapBy: 'name'
    });

    ecs.registerComponent('EquipmentSlot', {
      properties: {
        name: 'finger',
        slot: '<Entity>',
        effects: '<ComponentArray>'
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

    entity.components.Storage.pockets.items.push(food);

    expect(entity.components.Storage.pockets.items[0].id).to.equal(food.id);

    ecs.removeEntity(food);

    expect(ecs.getEntity(food.id)).to.be.undefined();
    ecs.removeEntity(entity.id);

    expect(ecs.getEntity(entity.id)).to.be.undefined();

  });

  lab.test('system subscriptions', () => {

    let changes = [];
    class System extends BaseSystem {

      constructor(ecs) {

        super(ecs);
        this.ecs.subscribe(this, 'EquipmentSlot');
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
                  const component = parent.addComponent(value.Wearable.effects[ctype], ctype);
                  components.push(component);
                }
                if (components.length > 0) {
                  const effect = parent.addComponent({ equipment: value.id }, 'EquipmentEffect');
                  for (const c of components) {
                    effect.effects.push(c);
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

    ecs.registerComponent('EquipmentEffect', {
      properties: {
        equipment: '',
        effects: '<ComponentArray>'
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

    ecs.addSystem('equipment', system);

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
    expect(entity.Burning).to.exist();
    expect(changes.length).to.equal(1);
    expect(changes[0].op).to.equal('setEntity');
    expect(changes[0].value).to.equal(pants.id);
    expect(changes[0].old).to.equal(null);

    //entity.EquipmentSlot.pants.slot = null;
    pants.destroy();
    ecs.runSystemGroup('equipment');

    expect(changes.length).to.be.greaterThan(0);
    expect(changes[0].value).to.be.null();
    expect(entity.EquipmentEffect).to.not.exist();
    expect(entity.Burning).to.not.exist();

  });

});


lab.experiment('component inheritance', () => {

  const ecs = new ECS();

  lab.test('register component class', () => {

    class Component1 extends BaseComponent {
    }
    Component1.definition = {};
    ecs.registerComponentClass(Component1);

    const entity = ecs.createEntity({
      Component1: {}
    });

    expect(entity.Component1).to.exist()
  });

  lab.test('override core properties', { plan: 1 }, (flags) => {

    class Component3 extends BaseComponent {
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

    class Component6 extends BaseComponent {
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
