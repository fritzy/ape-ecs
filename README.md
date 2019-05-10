# @fritzy/ecs

An [Entity-Component-System](https://en.wikipedia.org/wiki/Entity_component_system) library for JavaScript, written in ECMAScript 2018, intended for use in games and simulations.

Features:

* Easy to define Components.
* Component properties can be primitive types, Arrays, Objects, or References.
* Component reference types to Entities and Components (including Objects and Arrays of references)
* Components can be singular per entity or allow multiple.
* Multi-Components can be sets or mapped by a property.
* Query for entities by which components it must and must not have.
* Filter component queries by recent changes to component values or included components.
* Systems can subscribe to component change logs by component type.
* Systems have default entity queries that are persisted.
* Persisted queries are updated as entities change.
* Export/import support for saving state.
* 100% Test Coverage.

ECS
  * Using ECS
  * constructor
  * registerComponent method
  * registerComponentClass method
  * createEntity method
  * removeEntity method
  * getEntity method
  * queryEntities method
  * getComponents method
  * subscribe method
  * addSystem method
  * runSystemGroup method
  * tick method

Component
  * Using Components
  * definition
    * primitive properties
    * Entity and Component References
    * serialize
  * constructor
  * getObject method

Entity
  * Using Entities
  * constructor
  * addComponent method
  * removeComponent method
  * removeComponentByName method
  * getObject method
  * destroy method

System
  * Using Systems
  * constructor
  * update method
