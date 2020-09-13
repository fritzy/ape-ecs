# Ape ECS Overview

* [API Reference](./API_Reference.md)
* [Back to the README](../README.md)

## What is ECS (Entity-Component-System)?

This ground is well covered with a quick Internet search, but what you'll quickly discover is that when most articles describe ECS, they're describing a specific implementation.
Even the [Wikipedia Article](https://en.wikipedia.org/wiki/Entity_component_system) does this to some extent.

ECS is a paradigm for managing unencapsulated data in a game or simulation, enabling dynamic composition by combining types, and keeping game logic all within systems.
Each data type is a structure of values, and each instance has a unique identifier and the identifier of an entity.
Systems can query or filter for the entities they need by their composition, and apply their logic to this.

This de-encapusulation can be thought of as anti-Object-Oriented-Programming, and it kind of is, but that doesn't mean the implementation doesn't use classes for its Components, Systems, and Entities (some do, including ApeECS).

This is all very abstract, because it's a paradigm, a way of organizing data & code, and not a specific thing.
It all comes down to the definitions:

* Components: Data types, kind of like structs, usually. Instances have a unique id.
* Entities: The association of Component instances to an Entity id. In a simple implemention, an Entity is _only_ an id.
* Systems: Functions that filter down Entities to just the ones that they should apply to, and then applies their logic.

## Advantages of ECS

## How does ApeECS implement ECS?

### ApeECS Has Worlds

ApeECS has [a World class](./World.md) as a registry for Components, Entities, Systems, and Queries. You can register Component classes, System classes, create Entity instances (which in turn create Component instances), retrieve Entities and Components by id, run Systems, and create Queries.

### ApeECS has Components

ApeECS [Components](./Component.md) are extended from `ApeECS.Component` to define your properties and lifecycle methods and registered with a World.
Components are created when you create an Entity or added to an Entity later.
Components can be destroyed directly or by being removed from an Entity (effecively the same thing).

Components can return a JSON-like Object with `component.getObject` that matches the format for `entity.addComponent` and `world.createEntity`, making them easy to serialize, store, and restore.

### ApeECS has Entities

ApeECS [Entities](./Entity.md) can be created from a World instance, either with a manual or auto-generated id.
Within the creation factories, Component instances must be defined with initial values; any Entity that doesn't have any Components is destroyed.

Entities can also have Tags, which are like Components, they're just the types.
Unlike Components, a Tag is just a string, and Entity can only have one of the same type at at time.
Tags and Component types are not distinguished between each other for Queries or `entity.has(type)`.

Components can be retrieved from Entities with `entity.getComponents(type)` or entity.types[type], each retrieving a `Set` of component instances.
Tags are within an `entity.tags` `Set`.

### ApeECS has Systems

ApeECS [Systems](./System.md) are extended from `ApeECS.System`, typically with an overridden `init()` and `update(tick)` method.
You should set up all of your queries in `init()` and do your system logic on the resulting entities in your `update()` method.h

### ApeECS has Queries

### Other ApeECS Features

## Performance

## Future

Here's some of the things we're thinking about for the future.
We'd love to review your pull requests for these things.

* Query optimizations (Bitmask?)
  * Benchmarks and optimization for Queries
* Network support (commands and rewind).
* More patterns and Examples

We'd also love to see pull requests for improving the docs.
Grammar errors, inconsistencies, and inaccuracies all need to be fixed!
