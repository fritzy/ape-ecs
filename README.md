# Ape-ECS

An [Entity-Component-System](https://en.wikipedia.org/wiki/Entity_component_system) library for JavaScript, written in ECMAScript ES2018, intended for use in games and simulations.

__Features__:

* Easy to define Components.
* Component reference types to Entities (EntityRef, EntitySet, EntityObject)
* Advanced Queries based on Entity-Component composition, Entity references, and the last updated.
* Persisted queries are updated as Entity composition changes.
* Export/import support for saving/restoring state.
* 100% Test Coverage.

__About__:

The Entity-Component-System paradigm is great for managing dynamic objects in games and simulations. Instead of binding functionality to data through methods, systems are able to freely manipulate data directly that are retrieved through queries. This encourages dynamic composition of Entities and Systems that can freely interact through shared data. 

This arrangement of dynamic data types within an object and freely interacting systems leads to:
  * more complex composition
  * improved performance due to lack of API methods
  * [emergent gameplay](https://en.wikipedia.org/wiki/Emergent_gameplay) with logical behaviors that the programmer didn't necessarily directly envision

This library has been inspired by:
  * [Overwatch Gameplay Architecture and Netcode](https://www.youtube.com/watch?v=W3aieHjyNvw)
  * [Mozilla ECSY](https://blog.mozvr.com/introducing-ecsy/)

__Using This Library__
  * [Example Game](#exampleGame)
  * [Install](#install)
  * [Tests](#tests)


<a name="exampleGame"></a>
## Example Game

[Roguelike Example Using @fritzy/ecs + rot.js](https://github.com/fritzy/ecs-js-example)

<a name="install"></a>
## Install

```sh
npm install @fritzy/ecs 
```

<a name="tests"></a>
## Tests

The goal is to keep test coverage at 100%.

```sh
git clone git@github.com/fritzy/ecs-js.git
cd ecs-js
npm install
npm test
```

