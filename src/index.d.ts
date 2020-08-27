export declare class System {
    constructor(world: World);
    world: World;
    // _stagedChanges: any[];
    changes: any[];
    queries: any[];
    lastTick: number;
    init(): void;
    update(tick: number): void;
    createQuery(init: any): any;
    subscribe(type: any): void;
    _preUpdate(): void;
    _postUpdate(): void;
    _recvChange(change: any): void;
}

export interface IQueryReverse {
  entity: Entity|string;
  type: string;
}

export interface IQueryConfig {
  trackAdded?: boolean;
  trackRemoved?: boolean;
  persist?: boolean;
  from?: (Entity|string)[];
  fromAll?: string[];
  fromAny?: string[];
  fromReverse?: IQueryReverse;
  not?: string[];
}

export interface IQueryExecuteConfig {
  updatedComponents?: number;
  updatedValues?: number;
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
    // preDestroy(): void;
    // postDestroy(): void;
    getObject(withIds?: boolean): {
        type: string;
    };
    // _setup(entity: any, initial: any): void;
    entity: Entity;
    id: string;
    // _reset(): void;
    update(values: any): void;
    // _addRef(value: any, prop: any, sub: any): void;
    // _deleteRef(value: any, prop: any, sub: any): void;
}


export declare class Entity {
    types: {};
    c: {};
    id: string;
    tags: Set<string>;
    updatedComponents: number;
    updatedValues: number;
    destroyed: boolean;
    // _setup(definition: any): void;
    has(type: any): boolean;
    getOne(type: any): any;
    getComponents(type: any): any;
    addTag(tag: string, skipUpdate?: boolean): void;
    removeTag(tag: string): void;
    addComponent(properties: any): any;
    removeComponent(component: Component|string): boolean;
    getObject(componentIds?: boolean): {
        id: string;
        tags: any[];
        components: any[];
        c: {};
    };
    destroy(): void;
}

export interface IWorldConfig {
  trackChanges?: boolean;
  entityPool?: number;
}


export declare class World {
    constructor(config: IWorldConfig);
    // config: any;
    currentTick: number;
    entities: Map<any, any>;
    types: {};
    tags: Set<string>;
    entitiesByComponent: {};
    componentsById: Map<string, Component>;
    entityReverse: {};
    updatedEntities: Set<Entity>;
    componentTypes: {};
    components: Map<any, any>;
    queries: any[];
    subscriptions: Map<any, any>;
    systems: Map<any, any>;
    refs: {};
    componentPool: Map<any, any>;
    entityPool: any;
    /**
     * Called in order to increment ecs.currentTick, update indexed queries, and update key.
     * @method module:ECS#tick
     */
    tick(): number;
    _addRef(target: any, entity: any, component: any, prop: any, sub: any, key: any, type: any): void;
    _deleteRef(target: any, entity: any, component: any, prop: any, sub: any, key: any, type: any): void;
    /**
     * @typedef {Object} definition
     * @property {Object} properites
     * @property {function} init
     */
    /**
     * If you're going to use tags, you needs to let the ECS instance know.
     * @method module:ECS#registerTags
     * @param {string[]|string} tags - Array of tags to register, or a single tag.
     * @example
     * ecs.registerTags['Item', 'Blocked']);
     */
    registerTags(...tags: string[] | string): void;
    registerComponent(klass: any, spinup?: number): void;
    createEntity(definition: any): any;
    getObject(): any[];
    createEntities(definition: any): void;
    copyTypes(world: any, types: any): void;
    removeEntity(id: any): void;
    getEntity(entityId: any): any;
    getEntities(type: any): Set<any>;
    getComponent(id: any): any;
    createQuery(init: any): any;
    _sendChange(operation: any): void;
    registerSystem(group: any, system: any): any;
    runSystems(group: any): void;
    _entityUpdated(entity: any): void;
    _addEntityComponent(name: any, entity: any): void;
    _deleteEntityComponent(component: any): void;
    updateIndexes(entity: any): void;
    _updateIndexesEntity(entity: any): void;
}
 
