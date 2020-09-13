# Ape ECS Overview

* [API Reference](./API_Reference.md)
* [Back to the README](../README.md)

## What is ECS (Entity-Component-System)?

This ground is well covered with a quick Internet search, but what you'll quickly discover is that when most articles describe ECS, they're describing a specific implementation.
Even the [Wikipedia Article](https://en.wikipedia.org/wiki/Entity_component_system) does this to some extent.

ECS is a paradigm for managing unencapsulated data in a game or simulation, enabling dynamic composition by combining types, and keeping game logic all within systems.
Each data type is a structure of values, and each instance has a unique identifier and the identifier of an entity.
Systems can query or filter for the entities they need by their composition, and apply their logic to this.

This de-encapusulation can be thought of as anti-Object-Oriented-Programming, and it kind of is, but that doesn't mean the implementation doesn't use classes for its Components, Systems, and Entities (some do, including Ape ECS).

This is all very abstract, because it's a paradigm, a way of organizing data & code, and not a specific thing.
It all comes down to the definitions:

* Components: Data types, kind of like structs, usually. Instances have a unique id.
* Entities: The association of Component instances to an Entity id. In a simple implemention, an Entity is _only_ an id.
* Systems: Functions that filter down Entities to just the ones that they should apply to, and then applies their logic.

## Advantages of ECS

## How does Ape ECS implement ECS?

### Ape ECS Has Worlds

Ape ECS has [a World class](./World.md) as a registry for Components, Entities, Systems, and Queries. You can register Component classes, System classes, create Entity instances (which in turn create Component instances), retrieve Entities and Components by id, run Systems, and create Queries.

### Ape ECS has Components

Ape ECS [Components](./Component.md) are extended from `ApeECS.Component` to define your properties and lifecycle methods and registered with a World.
Components are created when you create an Entity or added to an Entity later.
Components can be destroyed directly or by being removed from an Entity (effecively the same thing).

Components can return a JSON-like Object with `component.getObject` that matches the format for `entity.addComponent` and `world.createEntity`, making them easy to serialize, store, and restore.

### Ape ECS has Entities

Ape ECS [Entities](./Entity.md) can be created from a World instance, either with a manual or auto-generated id.
Within the creation factories, Component instances must be defined with initial values; any Entity that doesn't have any Components is destroyed.

Entities can also have Tags, which are like Components, they're just the types.
Unlike Components, a Tag is just a string, and Entity can only have one of the same type at at time.
Tags and Component types are not distinguished between each other for Queries or `entity.has(type)`.

Components can be retrieved from Entities with `entity.getComponents(type)` or entity.types[type], each retrieving a `Set` of component instances.
Tags are within an `entity.tags` `Set`.

### Ape ECS has Systems

Ape ECS [Systems](./System.md) are extended from `ApeECS.System`, typically with an overridden `init()` and `update(tick)` method.
You should set up all of your queries in `init()` and do your system logic on the resulting entities in your `update()` method.

Systems also manage [Queryies](./Query.md) that are created from them if persisted. Change feeds and results are updated automatically before the system is run and cleaned up afterward.

### Ape ECS has Queries

Ape ECS has fairly advanced [Queries](./Query.md). Like most ECS systems, you can query for Entities that have at least a subset of types and tags. Additionly you can add results from Entities that have least one of a subset (rather than all). Furthermore you can filter results with exclusion (`.not()`), and filter down to results that must have at least one of (`.only()`).

If Queries are created within a System with `System.createQuery()` they can be persisted and tracked for changes. You can futher filter the result set by which tick their component/tag structure was last changed, or one they had component values that changed.

[Entity References](./Entity_Refs.md) allow you to start with an Entity and query for any other entities that have a given type that references them.

### Other Ape ECS Features

[Entity Refences](./Entity_Refs.md) allow for dynamicly maintained links between entities, and queries by reference.

[ApeDestroy](./World.md) is a tag that can be added to any entity that automatically cleans them up at the end of a world tick, and filters them from queries in the meantime (although you can override this per query). This is a common ECS lifecycle pattern.

## Performance

Right now, we've got benchmarks for creating, editing, pooling, and destroying entities and components. Here are the results on my 2.6 GHz 6-Core Intel Core i7 2019 Macbook Pro.

```
ape-ecs % node benchmark.js
Creating and destroying 50000 entities...
Create 50,000 entities with two simple components : 340.53ms
Changing the values of each component             : 6.53ms
Destroy 50,000 entities with two simple components: 339.78ms
Recreating components now that pool is established: 287.00ms
```

Peformance is a strong priority for Ape ECS, so we'll continue to create more benchmarks, optimizations, and usage patterns.

## Future

Here's some of the things we're thinking about for the future.
We'd love to review your pull requests for these things.

* Query optimizations (Bitmask?)
* Benchmarks and optimization for Queries
* Network support (commands and rewind).
* More patterns and Examples

We'd also love to see pull requests for improving the docs.
Grammar errors, inconsistencies, and inaccuracies all need to be fixed!
