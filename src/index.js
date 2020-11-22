const { EntityRef, EntitySet, EntityObject } = require('./entityrefs');
module.exports = {
  World: require('./world'),
  System: require('./system'),
  Component: require('./component'),
  Entity: require('./entity'),
  EntityRef,
  EntitySet,
  EntityObject
};
