* [x] double check system lifecycle (pre and post functions for query indexes)
  * [x] pooled resources shouldn't release until system end
* [x] Remove world.createEntityComponents
* [x] Move subscribe from world to system
* [ ] rename add \_meta.svalues, update refs to use svalues?
* [x] check component parameters for reserved values at registration
* [x] check component types and tags for registration collisions
* [x] Add component.preInit
* [ ] keep destroyed entities and components until tick()
* [ ] Pooling wind-down to min?
* [ ] World settings
  * [ ] Add a setting for updating queries immediately vs preUpdate or ticks?

* [ ] update example game
* [ ] document property factories ?
* [x] document subscription events in EntityRefs, World, and Systems
* [ ] get tests back to 100% coverage
* [ ] write launch blog post
* [ ] write pattern for MarkDestroy
* [ ] write game loop pattern
