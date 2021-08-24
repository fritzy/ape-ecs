const { EntityRef, EntitySet, EntityObject } = require('./entityrefs');
const { ComponentRegistry } = require('./componentregistry');
const BitQuery = require('./bitquery');

module.exports = {
  World: require('./world'),
  System: require('./system'),
  Component: require('./component'),
  Entity: require('./entity'),
  EntityRef,
  EntitySet,
  EntityObject,
  ComponentRegistry,
  BitQuery
};
