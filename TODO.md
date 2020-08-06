[ ] double check system lifecycle (pre and post functions for query indexes)
[ ] update example game
[ ] track component changes in entity
  - maybe add world.changedEntities Set, and update before every tick() or after every System.update?
  - maybe not using a getter would be faster for component.entity?
  - deleted this feature before because it slowed down properties writes 3x
[ ] component.entity should make just be a pointer
[ ] maybe get rid of c. composition for lookups and just have it at the root?
[ ] System init function rather than overriding the constructor
[ ] Remove world.createEntityComponents
