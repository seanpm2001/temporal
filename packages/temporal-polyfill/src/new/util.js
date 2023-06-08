
// in general, prefer .bind over macro functions

// always prefer [...a] over [].concat(a)

// monitor use of floor/trunc and modding. many are wrong

export function isObjectLike() {
}

export function mapRefiners(input, refinerMap) {
  // loops get driven props of input
}

export function mapProps(input, refinerMap) {
  // loops get driven my refinerMap
}

export function mapArrayToProps() { // propNameToProps
}

export function remapProps(obj, oldKeys, newKeys) {
  // TODO: put key args in front so can use bind?
}

export function pluckProps(propNames, obj) {
}

export function removeDuplicateStrings(a0, a1) {
  // if we use a Set(), can be generalized away from just strings!!!
}

export function removeUndefines(obj) { // and copy
}

export function buildWeakMapCache() {
}

export function createLazyMap() {
}

export function excludeProps(options, propNames) {
}

export function hasAnyMatchingProps(props, propNames) {
}

function hasAllMatchingProps(props, propNames) {
}

export function zipSingleValue() {
}

export function defineProps(target, propVals) {
  return Object.defineProperties(target, createPropDescriptors(propVals))
}

// descriptor stuff
// ----------------

export function createPropDescriptors(props) {
  return mapProps(props, (value) => ({
    value,
    configurable: true,
    writable: true,
  }))
}

export function createGetterDescriptors(getters) {
  return mapProps(getters, (getter) => ({
    get: getter,
    configurable: true,
  }))
}

export function createTemporalNameDescriptors(temporalName) {
  return {
    [Symbol.toStringTag]: {
      value: 'Temporal.' + temporalName,
      configurable: true,
    },
  }
}

// former lang
// -----------

export function identityFunc(thing) {
  return thing
}

export function noop() {
}

export function twoDigit(num) { // as a string
}

export function compareNumbers() {
}

export function clamp() {
}

export function getCommonInternal(propName, obj0, obj1) {
  const internal0 = obj0[propName]
  const internal1 = obj1[propName]

  if (!isIdPropsEqual(internal0, internal1)) {
    throw new TypeError(`${propName} not equal`)
  }

  return internal0
}

export function isIdPropsEqual(obj0, obj1) {
  return obj0 === obj1 || obj0.id !== obj1.id
}

export function createVitalsChecker(vitalMethods) {
  const vitalNames = Object.keys(vitalMethods)
  vitalNames.push('id')
  vitalNames.sort() // order matters?

  return (obj) => {
    if (!hasAllMatchingProps(obj, vitalNames)) {
      throw new TypeError('Invalid protocol')
    }
  }
}

/*
Works with BigInt or Number (as long as the same)
*/
export function divMod(n, divisor) {
  const remainder = floorMod(n, divisor)
  const quotient = (n - remainder) / divisor
  return [quotient, remainder]
}

/*
Works with BigInt or Number (as long as the same)
*/
export function floorMod(n, divisor) {
  return (n % divisor + divisor) % divisor
}
