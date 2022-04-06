import { durationUnitNames } from '../argParse/unitStr'
import { Calendar } from '../public/calendar'
import { durationDayTimeToNano } from './dayAndTime'
import { DiffableObj } from './diff'
import { computeLargestDurationUnit } from './durationFields'
import { spanDurationFromDateTime } from './durationSpan'
import { toEpochNano } from './epoch'
import { DurationFields, UnsignedDurationFields } from './typesPrivate'
import { DAY, UnitInt, YEAR, isDayTimeUnit, nanoIn } from './units'

export function computeTotalUnits(
  duration: DurationFields,
  unit: UnitInt,
  relativeTo: DiffableObj | undefined,
  calendar: Calendar | undefined,
): number {
  if (
    relativeTo === undefined &&
    computeLargestDurationUnit(duration) <= DAY &&
    isDayTimeUnit(unit)
  ) {
    // TODO: accidentaly loss of precision?
    return Number(durationDayTimeToNano(duration)) / nanoIn[unit]
  }

  if (!relativeTo) {
    throw new RangeError('Need relativeTo')
  }

  const [balancedDuration, relativeToTranslated] = spanDurationFromDateTime(
    duration,
    unit,
    relativeTo,
    calendar!,
    true, // dissolveWeeks
  )

  const durationLike = computeExactDuration(
    balancedDuration,
    unit,
    relativeTo,
    relativeToTranslated,
  )

  const unitName = durationUnitNames[unit] as keyof UnsignedDurationFields
  return durationLike[unitName]
}

// TODO: rename to computeFracDuration
// PRECONDITION: dates have same calendar
// RETURNS: raw duration fields that might have floating-point values
// Those floating-point values will need to rounded before creating a proper Duration
export function computeExactDuration(
  balancedDuration: DurationFields,
  smallestUnit: UnitInt,
  dt0: DiffableObj,
  dt1: DiffableObj,
): DurationFields {
  const smallestUnitName = durationUnitNames[smallestUnit] as keyof UnsignedDurationFields
  const { sign } = balancedDuration

  // make a new duration object that excludes units smaller than smallestUnit
  const dur: Partial<DurationFields> = {}
  for (let unit = YEAR; unit >= smallestUnit; unit--) {
    const durationUnit = durationUnitNames[unit] as keyof UnsignedDurationFields
    dur[durationUnit] = balancedDuration[durationUnit]
  }

  // a single additional unit of `unit`
  const incDur: Partial<DurationFields> = { [smallestUnitName]: sign }
  const startDateTime = dt0.add(dur)
  const endDateTime = startDateTime.add(incDur)

  const startNano = toEpochNano(startDateTime)
  const endNano = toEpochNano(endDateTime)
  const middleNano = toEpochNano(dt1)
  const unitFrac = Number(middleNano - startNano) / Number(endNano - startNano) * sign

  dur[smallestUnitName]! += unitFrac // above loop populated this
  return dur as DurationFields
}
