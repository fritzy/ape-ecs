import { Component } from './component';
import Entity from './entity';

export class EntityComponent extends Component {

  static properties: any = {
    linkId: null
  };

  _link: Entity;

  constructor() {
    super();
    this._link = undefined;
    (this.constructor as typeof EntityComponent).properties.linkId = undefined;
  }

  get link() {
    return this._link;
  }

  get linkId() {
    if (this._link !== undefined) {
      return this._link.id;
    }
  }

  set link(entity) {
    if (entity === undefined && this._link !== undefined) {
      this._link._unlinkComponent(this);
      this._link = undefined;
      return;
    }
    if (entity) {
      if (this._link !== undefined) {
        this._link._unlinkComponent(this);
      }
      this._link = entity;
      this._link._linkComponent(this);
    }
  }

  set linkId(id) {
    if (id === undefined) {
      this.link = undefined;
      return;
    }
    const entity = this.world.getEntity(id);
    if (!entity) {
      throw new Error(`Entity not found: ${id}`);
    }
    this.link = entity;
  }

  destroy() {
    this.entity = undefined;
    super.destroy();
  }
}
