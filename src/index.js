const { EntityRef, EntitySet, EntityObject } = require('./entityrefs');
const Component = require('./component');

function TypedComponent(props) {
  const typedClass = class TypedComponent extends Component {};
  typedClass.properties = { ...props };
  return typedClass;
}

module.exports = {
  World: require('./world'),
  System: require('./system'),
  Entity: require('./entity'),
  Component,
  TypedComponent,
  EntityRef,
  EntitySet,
  EntityObject
};
