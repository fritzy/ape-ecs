const { ComponentRegistry } = require('./componentregistry');
const Query = require('./query');

module.exports = {
  World: require('./world'),
  System: require('./system'),
  Component: require('./component'),
  EntityComponent : require('./linkcomponent'),
  Entity: require('./entity'),
  ComponentRegistry,
  Query
};
