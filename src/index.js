const { ComponentRegistry } = require('./componentregistry');
const BitQuery = require('./bitquery');

module.exports = {
  World: require('./world'),
  System: require('./system'),
  Component: require('./component'),
  EntityComponent : require('./linkcomponent'),
  Entity: require('./entity'),
  ComponentRegistry,
  BitQuery
};
