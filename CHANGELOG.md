## 1.1.0 November 1, 2020

Performance improvements through id generation. Thanks Martin Emmert!  
Entity/Component creation benchmarks have improved by 40%+!  
Build sizes are also significantly smaller due to no longer using the node.js `crypto` library.

* Swap to UUIDv4 for performance improvements \([martinemmert](https://github.com/martinemmert)\]
* Fix of webbenchmark \[[martinemmert](https://github.com/martinemmert)\]
* Web Benchmark is now apples-to-apples comparison, reflected in Overview.md \[[fritzy](https://github.com/fritzy)\]

## 1.2.0 November 22, 2020

* Components can be registered to multiple worlds. (more multi-world support to come)
* Prettier config and formatting.
* Components typeName static property to deal with minimizers (compiling packages sometimes change function/class names).
* Custom System init parameters.
* TypeScript fixes.
* System.subscribe will now take Component class as well as name (to match other functions that take Component type).

## 1.3.0 November 29, 2020

* Fix id prefixes
* added typeName Component property

## 1.3.1 February 1, 2021

* check for calling entity.destroy() twice
* updated Docs to not use static property pattern
