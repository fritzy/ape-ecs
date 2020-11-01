## 1.1.0 November 1, 2020

Performance improvements through id generation. Thanks Martin Emmert! 
Entity/Component creation benchmarks have improved by 40%+! 
Build sizes are also significantly smaller due to no longer using the node.js `crypto` library.

* [x] Swap to UUIDv4 for performance improvements [martinemmert](https://github.com/martinemmert)
* [x] Fix of webbenchmark [martinemmert](https://github.com/martinemmert)
