import { durationFieldIndexes } from './durationFields'
import { bigIntToLargeInt } from './largeInt'
import { unitIndexes, unitNamesAsc } from './units'

// TODO: for unit parsing, ensure ceiling and correct increment

export function strictNumber(input) {

}

export function strictInstanceOf(obj, Class) {
}

export function strictArrayOfStrings(obj) { // rethink
}

export function strictArrayOfType(obj) { // used?
}

export function strictArray() {

}

export function toObjectOptional(obj) {
  return obj === undefined ? {} : toObject(obj)
}

export function toObject() {
  // ensures a real object. throws error otherwise
}

export function toEpochNano(input) {
  if (typeof input !== 'bigint') {
    throw new TypeError('aaah')
  }
  return bigIntToLargeInt(input)
}

export function toNumber(value) {
  if (typeof value === 'bigint') {
    throw new TypeError('Cannot convert BigInt to number')
  }
  return Number(value)
}

export function toInteger(value) {
  const num = toNumber(value)
  if (isNaN(num)) return 0
  const integer = Math.trunc(num)
  if (num === 0) return 0
  return integer
}

export function toStringOrUndefined() {
}

export function toNumberOrUndefined() {

}

export function toString(value) {
  if (typeof value === 'symbol') {
    throw new TypeError('Cannot convert a Symbol value to a String')
  }
  return String(value)
}

export function toIntegerThrowOnInfinity(value) {
  const integer = toInteger(value)
  if (!Number.isFinite(integer)) {
    throw new RangeError('infinity is out of range')
  }
  return integer
}

export function toBoolean() {

}

export function toPositiveInteger(valueParam, property) {
  const value = toInteger(valueParam)
  if (!Number.isFinite(value)) {
    throw new RangeError('infinity is out of range')
  }
  if (value < 1) {
    if (property !== undefined) {
      throw new RangeError(`property '${property}' cannot be a a number less than one`)
    }
    throw new RangeError('Cannot convert a number less than one to a positive integer')
  }
  return value
}

export function toIntegerWithoutRounding(valueParam) {
  const value = toNumber(valueParam)
  if (isNaN(value)) return 0
  if (!Number.isFinite(value)) {
    throw new RangeError('infinity is out of range')
  }
  if (!Number.isInteger(value)) {
    throw new RangeError(`unsupported fractional value ${value}`)
  }
  return toInteger(value) // ℝ(value) in spec text; converts -0 to 0
}

// best place for this? (has 'overflow')
export function constrainInt(subject, minIncl, maxIncl, overflow = 'reject') {
  // maybe don't accept min? already vetted to be positive (or non-negative) integer
}

export function largestOfTwoUnits() {

}

export function toOffsetHandling() {

}

export function toZonedRefiningOptions(options) {
  options = toObjectOptional(options)

  return { // TODO: use tuple?
    overflow: toOverflow(options),
    offset: toOffset(options),
    disambiguation: toDisambiguation(options),
  }
}

function toOffset() {

}

export function toDisambiguation() {

}

export function toLargestUnit() {

}

export function toSmallestUnit() {
}

export function isTimeUnit(unit) {
  return unit !== 'year' &&
    unit !== 'month' &&
    unit !== 'week' &&
    unit !== 'day'
}

export function toCalendarNameOption() {

}

export function toDiffOptions() {

}

export function toOverflow() {

}

export function toOverflowOptions() {

}

export function validateRoundingOptions(options) {
  /*
    if (roundTo === undefined) throw new TypeError('options parameter is required');
    if (ES.Type(roundTo) === 'String') {
      const stringParam = roundTo;
      roundTo = ObjectCreate(null);
      roundTo.smallestUnit = stringParam;
    } else {
      roundTo = ES.GetOptionsObject(roundTo);
    }
    const roundingIncrement = ES.ToTemporalRoundingIncrement(roundTo);
    const roundingMode = ES.ToTemporalRoundingMode(roundTo, 'halfExpand');
    const smallestUnit = ES.GetTemporalUnit(roundTo, 'smallestUnit', 'time', ES.REQUIRED, ['day']);
    const maximumIncrements = {
      day: 1,
      hour: 24,
      minute: 60,
      second: 60,
      millisecond: 1000,
      microsecond: 1000,
      nanosecond: 1000
    };
    const maximum = maximumIncrements[smallestUnit];
    const inclusive = maximum === 1;
    ES.ValidateTemporalRoundingIncrement(roundingIncrement, maximum, inclusive);
  */
}

export function optionsToLargestUnit() {
  // TODO: rename to optionsToLargestUnitIndex
}

export function optionsToOverflow(options) {
  return toOverflow(toObjectOptional(options).overflow)
}

export function optionsToTotalUnit() {
  // TODO: rename to optionsToTotalUnitIndex
}

export function optionsToRelativeTo() {
  // should return ZoneDateTimeINTERNALS or PlainDateINTERNALS
}

export function optionsToSmallestUnit(options) {
  // TODO: rename to optionsToSmallestUnitIndex
}

export function optionsToRoundingIncrement(options) {
}

export function optionsToRoundingMode(options) {
}

export function overflowToOptions(overflow) {
  return { overflow }
}

export function largestUnitToOptions(largestUnitIndex) {
  return { largestUnit: unitNamesAsc[largestUnitIndex] }
}

// Units
// -------------------------------------------------------------------------------------------------

export function toUnit(unitName) {
  unitName = toString(unitName)
  const unitIndex = unitIndexes[unitName] ?? durationFieldIndexes[unitName]

  if (unitIndex === undefined) {
    throw new RangeError('Invalid unit')
  }

  return unitIndexes[unitName]
}
