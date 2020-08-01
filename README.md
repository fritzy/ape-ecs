# Ape-ECS
![Ape-ECS Hero](https://raw.githubusercontent.com/fritzy/ape-ecs/lightweight/imgs/ape_ecs900.png)

An [Entity-Component-System](https://en.wikipedia.org/wiki/Entity_component_system) library for JavaScript, written in ECMAScript ES2018, intended for use in games and simulations.

## Documentation
* [Overview](https://github.com/fritzy/ape-ecs/blob/lightweight/docs/Overview.md)
* [API Reference](https://github.com/fritzy/ape-ecs/blob/lightweight/docs/API.md)

__Some Features__:

* Easy to define Components.
* Advanced Queries based on Entity-Component composition, Entity references, and the last updated.
* Persisted queries are updated as Entity composition changes.
* Component reference types to Entities (EntityRef, EntitySet, EntityObject)
* Export/import support for saving/restoring state.
* 100% Test Coverage.

__About__:

The Entity-Component-System paradigm is great for managing dynamic objects in games and simulations. Instead of binding functionality to data through methods, systems are able to freely manipulate data directly that are retrieved through queries. This encourages dynamic composition of Entities and Systems that can freely interact through shared data. 

ECS's dynamic data composition and freely interacting systems leads to:
  * More complex and dynamic composition than OOP
  * Improved performance due to lack of API methods
  * [Emergent Gameplay](https://en.wikipedia.org/wiki/Emergent_gameplay) with logical behavior that the programmer didn't envision.

This library has been inspired in part by:
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

