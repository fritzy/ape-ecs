import { World } from './world';
const Query = require('./query');

export class System {

  world: World;
  queries: any[];
  lastTick: number;

  constructor(world: World, initArgs?: object) {
    this.world = world;
    this.queries = [];
    this.lastTick = this.world.currentTick;
    this.init(initArgs);
  }

  init(initArgs?: object) {}

  update(tick: number) {}

  createQuery(query: any): typeof Query {
    return new Query(this.world, { system: this, ...query });
  }

  _preUpdate() {
    this.world.updateIndexes();
  }

  _postUpdate() {
    for (const query of this.queries) {
      query.clearChanges();
    }
  }

}
