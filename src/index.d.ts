// component changes that are passed to Systems
export interface IComponentChange {
  op: string;
  props?: string[];
  component: string;
  entity: string;
  type: string;
  target?: string;
}

// used by .fromReverse() in queries
export interface IQueryReverse {
  entity: Entity|string;
  type: string|ComponentClass;
}

// the object passed to world.createQuery()
export interface IQueryConfig {
  trackAdded?: boolean;
  trackRemoved?: boolean;
  persist?: boolean;
  from?: (Entity|string)[];
  all?: (string|ComponentClass)[];
  any?: (string|ComponentClass)[];
  reverse?: IQueryReverse;
  not?: (string|ComponentClass)[];
  only?: (string|ComponentClass)[];
}

export declare class System {
  constructor(world: World);
  world: World;
  changes: IComponentChange[];
  queries: Query[];
  lastTick: number;
  static subscriptions: string[];
  init(): void;
  update(tick: number): void;
  createQuery(init: IQueryConfig): Query;
  subscribe(type: string): void;
}


// passed to query.execute()
export interface IQueryExecuteConfig {
  updatedComponents?: number;
  updatedValues?: number;
}

// returned from component.getObject()
export interface IComponentObject {
  id?: string;
  entity?: string;
  [others: string]: any;
}

// used when creating an entity with the .c option
export interface IComponentConfigVal {
  // type: string;
  id?: string;
  entity?: string;
  [others: string]: any;
}

export declare class Query {
  constructor(world: World, system: System, init: IQueryConfig);
  persisted: boolean;
  results: Set<Entity>;
  executed: boolean;
  added: Set<Entity>;
  removed: Set<Entity>;
  trackAdded: boolean;
  trackRemoved: boolean;
  from(...entities: (Entity|string)[]): Query;
  fromReverse<T extends typeof Component>(entity: (Entity|string), componentName: string|T): Query;
  fromAll<T extends typeof Component>(...types: (string|T)[]): Query;
  fromAny<T extends typeof Component>(...types: (string|T)[]): Query;
  not<T extends typeof Component>(...types: (string|T)[]): Query;
  only<T extends typeof Component>(...types: (string|T)[]): Query;
  persist(trackAdded?: boolean, trackRemoved?: boolean): Query;
  execute(filter?: IQueryExecuteConfig): Set<Entity>;
}


export interface IComponentUpdate {
  type?: never;
  [others: string]: any;
}

// in order to reference the class rather than the instance
interface ComponentClass {
  new(): Component;
}

export declare class Component {
  preInit(initial: any): any;
  init(initial: any): void;
  get type(): string;
  set key(arg: string);
  get key(): string;
  destroy(): void;
  preDestroy(): void;
  postDestroy(): void;
  getObject(withIds?: boolean): IComponentObject;
  entity: Entity;
  id: string;
  update(values?: IComponentUpdate): void;
  [name: string]: any;
}

// an object that has strings as keys and strings as values
// has "Map" in the name because it's almost a Map(), close enough
export interface IStringMap {
  [name: string]: string;
}

// an object that has strings as keys and strings or null as values
export interface IStringNullMap {
  [name: string]: string | null;
}


// an object where the key is a string and the val is a set of Components
export interface IEntityByType {
  [name: string]: Set<Component>;
}

// an object where the key is a string and the val is a single Component
export interface IEntityComponents {
  [name: string]: Component;
}

// an object where the key is a string and the val is a single ComponentObject
export interface IEntityComponentObjects {
  [name: string]: IComponentObject;
}

// Illegal properties without key or type or constructor
export interface MostIllegalProperties {
  // constructor?: never;
  init?: never;
  // type?: never;
  // key?: never;
  destroy?: never;
  preDestroy?: never;
  postDestroy?: never;
  getObject?: never;
  _setup?: never;
  _reset?: never;
  update?: never;
  clone?: never;
  _meta?: never;
  _addRef?: never;
  _deleteRef?: never;
  prototyp?: never;
}

// passed to entity.addComponent()
export interface IComponentConfig extends MostIllegalProperties {
  type: string;
  key?: string;
  [others: string]: any;
}

// an object where keys are strings and val is a IComponentConfigVal
export interface IComponentConfigValObject {
  [name: string]: IComponentConfigVal;
}



// returned from entity.getObject()
export interface IEntityObject {
  id: string;
  tags: string[];
  components: IComponentObject[];
  c: IEntityComponentObjects;
}


// an object where the key is a string and the val is a single System
// export interface IWorldSubscriptions {
//   [name: string]: System;
// }


export declare class Entity {
  types: IEntityByType;
  c: IEntityComponents;
  id: string;
  tags: Set<string>;
  updatedComponents: number;
  updatedValues: number;
  destroyed: boolean;
  // _setup(definition: any): void;
  has(type: string|ComponentClass): boolean;
  getOne(type: string|ComponentClass): Component | undefined;
  getComponents(type: string|ComponentClass): Set<Component>;
  addTag(tag: string, skipUpdate?: boolean): void;
  removeTag(tag: string): void;
  addComponent(properties: IComponentConfig): Component;
  removeComponent(component: Component|string): boolean;
  getObject(componentIds?: boolean): IEntityObject;
  destroy(): void;
}

export interface IWorldConfig {
  trackChanges?: boolean;
  entityPool?: number;
  cleanupPools?: boolean;
}

// passed to world.createEntity()
export interface IEntityConfig {
  id?: string;
  tags?: string[];
  components?: (IComponentConfig)[];
  c?: IComponentConfigValObject;
}

export interface IPoolStat {
  active: number,
  pooled: number,
  target: number
}

export interface IWorldStats {
  entity: IPoolStat
  components: {
    [key:string]: IPoolStat
  }
}

export declare class World {
  constructor(config?: IWorldConfig);
  currentTick: number;
  entities: Map<string, Entity>;
  tags: Set<string>;
  entitiesByComponent: IEntityByType;
  componentsById: Map<string, Component>;
  updatedEntities: Set<Entity>;
  componentTypes: IEntityComponents;
  queries: Query[];
  subscriptions: Map<string, System>;
  systems: Map<string, System>;
  tick(): number;
  registerTags(...tags: string[]): void;

  // Both options allow the passing of a class that extends Component 
  registerComponent<T extends typeof Component>(klass: T, spinup?: number): void;

  getStats(): IWorldStats;
  logStats(freq: number, callback?: Function): void;

  createEntity(definition: IEntityConfig|IEntityObject): Entity;
  getObject(): IEntityObject[];
  createEntities(definition: IEntityConfig[]|IEntityObject[]): void;
  copyTypes(world: World, types: string[]): void;
  removeEntity(id: Entity|string): void;
  getEntity(entityId: string): any;
  getEntities(type: string|ComponentClass): Set<Entity>;
  getComponent(id: string): Component;
  createQuery(init?: IQueryConfig): Query;

  // Allows passing of a class that extends System, or an instance of such a class
  registerSystem<T extends typeof System>(group: string, system: T|System): any;

  runSystems(group: string): void;
  updateIndexes(entity?: Entity): void;
}

declare class EntitySetC extends Set<any> {
  constructor(component: Component, object: any, field: string);
  component: Component;
  field: string;
  sub: string;
  dvalue: any;
  getValue(): string[];
}

// This is a proxy
export interface IEntityRef {
  get(): Entity;
  set(value: Entity|string): void;
}

// This is a proxy
export interface IEntityObject {
  get(obj: IStringNullMap, prop: string): Entity;
  set(obj: IStringNullMap, prop: string, value: string): boolean;
  deleteProperty(obj: IStringNullMap, prop: string): boolean;
  [others: string]: any;
}




export function EntityRef(comp: Component, dvalue: any, field: string): IEntityRef;
export function EntityObject(comp: Component, object: any, field: string): IEntityObject;
export function EntitySet(component: Component, object: any[], field: string): EntitySetC;
