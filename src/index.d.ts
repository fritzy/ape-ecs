// component changes that are passed to Systems
export interface IComponentChange {
  op: string;
  props?: string[];
  component: string;
  entity: string;
  type: string;
}

// used by .fromReverse() in queries
export interface IQueryReverse {
  entity: Entity|string;
  type: string;
}

// the object passed to world.createQuery()
export interface IQueryConfig {
  trackAdded?: boolean;
  trackRemoved?: boolean;
  persist?: boolean;
  from?: (Entity|string)[];
  all?: string[];
  any?: string[];
  reverse?: IQueryReverse;
  not?: string[];
}



export declare class System {
    constructor(world: World);
    world: World;
    changes: IComponentChange[];
    queries: Query[];
    lastTick: number;
    init(): void;
    update(tick: number): void;
    createQuery(init: IQueryConfig): any;
    subscribe(type: string): void;
}


// passed to query.execute()
export interface IQueryExecuteConfig {
  updatedComponents?: number;
  updatedValues?: number;
}

// returned from component.getObject()
export interface IComponentObject {
  type: string;
  id?: string;
  entity?: string;
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
    fromReverse(entity: Entity, componentName: string): Query;
    fromAll(...types: string[]): Query;
    fromAny(...types: string[]): Query;
    not(...types: string[]): Query;
    persist(trackAdded: boolean, trackRemoved: boolean): Query;
    execute(filter?: IQueryExecuteConfig): Set<Entity>;
}



export declare class Component {
    // static properties: {};
    // static serialize: boolean;
    // static serializeFields: any;
    // static subbed: boolean;
    // constructor(entity: any, initial: any);
    // _meta: {
    //     key: string;
    //     updated: number;
    //     entityId: string;
    //     refs: Set<any>;
    //     ready: boolean;
    //     values: {};
    // };
    // preInit(initial: any): any;
    init(initial: any): void;
    get type(): string;
    set key(arg: string);
    get key(): string;
    destroy(): void;
    preDestroy(): void;
    postDestroy(): void;
    getObject(withIds?: boolean): IComponentObject;
    // _setup(entity: any, initial: any): void;
    entity: Entity;
    id: string;
    // _reset(): void;
    update(values: any): void;
    // _addRef(value: any, prop: any, sub: any): void;
    // _deleteRef(value: any, prop: any, sub: any): void;
}

// an object that has strings as keys and strings as values
// has "Map" in the name because it's almost a Map(), close enough
export interface IStringMap {
  [name: string]: string;
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

// passed to entity.addComponent()
export interface IComponentConfig {
  type: string;
  key?: string;
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
    has(type: string): boolean;
    getOne(type: string): Component | undefined;
    getComponents(type: any): Set<Component>;
    addTag(tag: string, skipUpdate?: boolean): void;
    removeTag(tag: string): void;
    addComponent(properties: IComponentConfig): any;
    removeComponent(component: Component|string): boolean;
    getObject(componentIds?: boolean): IEntityObject;
    destroy(): void;
}

export interface IWorldConfig {
  trackChanges?: boolean;
  entityPool?: number;
}

// passed to world.createEntity()
export interface IEntityConfig {
  id?: string;
  components?: IComponentConfig[];
}



export declare class World {
    constructor(config: IWorldConfig);
    // config: any;
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
    registerComponent<T extends typeof Component>(klass: T, spinup?: number): void;
    // registerComponent(klass: typeof Component, spinup?: number): void;
    createEntity(definition: IEntityConfig): any;
    getObject(): any[];
    createEntities(definition: any): void;
    copyTypes(world: any, types: any): void;
    removeEntity(id: any): void;
    getEntity(entityId: any): any;
    getEntities(type: any): Set<any>;
    getComponent(id: any): any;
    createQuery(init: IQueryConfig): any;
    _sendChange(operation: any): void;
    registerSystem(group: any, system: any): any;
    runSystems(group: any): void;
    _entityUpdated(entity: any): void;
    _addEntityComponent(name: any, entity: any): void;
    _deleteEntityComponent(component: any): void;
    updateIndexes(entity: any): void;
    _updateIndexesEntity(entity: any): void;
}
 
