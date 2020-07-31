[x] test coverage 100%
[x] Entities composed with components from entity.c.component, Object output the same.
[x] query can remember added and removed entities if indexed
[x] check field names on registration
[x] check tag/component names on registration
[x] test for out-of-order ref deserialization
[-] mark components and entities as destroyed and clean up later?
[-] port to ES Modules -- was too much of a pain for test coverage
[x] port testing to mocha+chai.expect+istanbul
[x] make component lookup simpler
[ ] track component changes in entity
  - maybe add world.changedEntities Set, and update before every tick() or after every System.update?
  - maybe not using a getter would be faster for component.entity?
  - deleted this feature before because it slowed down properties writes 3x
[ ] update documentation
  [-] jsdoc?
