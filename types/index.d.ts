
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

