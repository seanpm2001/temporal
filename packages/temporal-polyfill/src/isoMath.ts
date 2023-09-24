import { Overflow } from './options'
import { diffEpochMilliByDay } from './diff'
import {
  IsoDateTimeFields,
  IsoDateFields,
  IsoTimeFields,
  IsoTuple,
  isoTimeFieldNamesAsc,
  pluckIsoTuple,
  isoTimeFieldDefaults,
} from './isoFields'
import {
  Unit,
  givenFieldsToDayTimeNano,
  milliInDay,
  milliInSec,
  nanoInMicro,
  nanoInMilli,
  nanoInSec,
  nanoInUtcDay,
  nanoToGivenFields,
} from './units'
import { NumSign, divModFloor, clampProp, compareNumbers, divModTrunc, modFloor } from './utils'
import { DayTimeNano, addDayTimeNanoAndNumber, compareDayTimeNanos, dayTimeNanoToBigInt, dayTimeNanoToNumber, dayTimeNanoToNumberRemainder, numberToDayTimeNano } from './dayTimeNano'

// ISO Calendar
// -------------------------------------------------------------------------------------------------

export const isoEpochOriginYear = 1970
export const isoEpochFirstLeapYear = 1972
export const isoMonthsInYear = 12
export const isoDaysInWeek = 7

export function computeIsoDaysInWeek(isoDateFields: IsoDateFields) {
  return isoDaysInWeek
}

export function computeIsoMonthsInYear(isoYear: number): number { // for methods
  return isoMonthsInYear
}

export function computeIsoDaysInMonth(isoYear: number, isoMonth: number): number {
  switch (isoMonth) {
    case 2:
      return computeIsoIsLeapYear(isoYear) ? 29 : 28
    case 4:
    case 6:
    case 9:
    case 11:
      return 30
  }
  return 31
}

export function computeIsoDaysInYear(isoYear: number): number {
  return computeIsoIsLeapYear(isoYear) ? 366 : 365
}

export function computeIsoIsLeapYear(isoYear: number): boolean {
  // % is dangerous, but comparing 0 with -0 is fine
  return isoYear % 4 === 0 && (isoYear % 100 !== 0 || isoYear % 400 === 0)
}

export function computeIsoDayOfYear(isoDateFields: IsoDateFields): number {
  return diffEpochMilliByDay(
    isoToEpochMilli(isoDateMonthStart(isoDateFields))!,
    isoToEpochMilli(isoDateFields)!,
  ) + 1
}

export function computeIsoDayOfWeek(isoDateFields: IsoDateFields): number {
  const [legacyDate, nudge] = isoToLegacyDate(
    isoDateFields.isoYear,
    isoDateFields.isoMonth,
    isoDateFields.isoDay,
  )

  return modFloor(legacyDate.getDay() + 1 - nudge, 7) || 7
}

export function computeIsoYearOfWeek(isoDateFields: IsoDateFields): number {
  return computeIsoWeekInfo(isoDateFields).isoYear
}

export function computeIsoWeekOfYear(isoDateFields: IsoDateFields): number {
  return computeIsoWeekInfo(isoDateFields).isoWeek
}

function computeIsoWeekInfo(isoDateFields: IsoDateFields): {
  isoYear: number,
  isoWeek: number,
} {
  const doy = computeIsoDayOfYear(isoDateFields)
  const dow = computeIsoDayOfWeek(isoDateFields)
  const doj = computeIsoDayOfWeek(isoDateMonthStart(isoDateFields))
  const isoWeek = Math.floor((doy - dow + 10) / isoDaysInWeek)
  const { isoYear } = isoDateFields

  if (isoWeek < 1) {
    return {
      isoYear: isoYear - 1,
      isoWeek: (doj === 5 || (doj === 6 && computeIsoIsLeapYear(isoYear - 1))) ? 53 : 52,
    }
  }
  if (isoWeek === 53) {
    if (computeIsoDaysInYear(isoYear) - doy < 4 - dow) {
      return {
        isoYear: isoYear + 1,
        isoWeek: 1,
      }
    }
  }

  return { isoYear, isoWeek }
}

function isoDateMonthStart(isoDateFields: IsoDateFields): IsoDateFields {
  return { ...isoDateFields, isoMonth: 1, isoDay: 1 }
}

const maxDays = 1e8
const epochNanoMax: DayTimeNano = [maxDays, 0]
const epochNanoMin: DayTimeNano = [-maxDays, 0]
const isoYearMax = 275760 // optimization. isoYear at epochNanoMax
const isoYearMin = -271821 // optimization. isoYear at epochNanoMin

export function checkIsoYearMonthInBounds<T extends IsoDateFields>(isoFields: T): T {
  // TODO: just authenticate based on hardcoded min/max isoYear/Month/Day. for other types too
  clampProp(isoFields, 'isoYear' as any,  -271821, 275760, Overflow.Reject)

  if (isoFields.isoYear === isoYearMin) {
    clampProp(isoFields, 'isoMonth' as any, 4, 12, Overflow.Reject)
  } else if (isoFields.isoYear === isoYearMax) {
    clampProp(isoFields, 'isoMonth' as any, 1, 9, Overflow.Reject)
  }

  return isoFields
}

export function checkIsoDateInBounds<T extends IsoDateFields>(isoFields: T): T {
  checkIsoDateTimeInBounds({
    ...isoFields,
    ...isoTimeFieldDefaults,
    isoHour: 12, // Noon avoids trouble at edges of DateTime range (excludes midnight) ???
  })
  return isoFields
}

export function checkIsoDateTimeInBounds<T extends IsoDateTimeFields>(isoFields: T): T {
  const isoYear = clampProp(isoFields as IsoDateFields, 'isoYear', isoYearMin, isoYearMax, Overflow.Reject)

  // TODO: more DRY
  const nudge = isoYear === isoYearMin ? 1 : isoYear === isoYearMax ? -1 : 0

  if (nudge) {
    // needs to be within 23:59:59.999 of min/max epochNano
    checkEpochNanoInBounds(
      isoToEpochNano({
        ...isoFields,
        isoDay: isoFields.isoDay + nudge,
        isoNanosecond: isoFields.isoNanosecond - nudge
      })
    )
  }

  return isoFields
}

export function checkEpochNanoInBounds(epochNano: DayTimeNano | undefined): DayTimeNano {
  if (
    epochNano === undefined ||
    compareDayTimeNanos(epochNano, epochNanoMin) === -1 || // epochNano < epochNanoMin
    compareDayTimeNanos(epochNano, epochNanoMax) === 1 // epochNano > epochNanoMax
  ) {
    throw new RangeError('epochNanoseconds out of range')
  }
  return epochNano
}

// Field <-> Nanosecond Conversion
// -------------------------------------------------------------------------------------------------

export function isoTimeFieldsToNano(isoTimeFields: IsoTimeFields): number {
  return givenFieldsToDayTimeNano(isoTimeFields, Unit.Hour, isoTimeFieldNamesAsc)[1]
}

export function nanoToIsoTimeAndDay(nano: number): [IsoTimeFields, number] {
  const [dayDelta, timeNano] = divModFloor(nano, nanoInUtcDay)
  const isoTimeFields = nanoToGivenFields(timeNano, Unit.Hour, isoTimeFieldNamesAsc) as IsoTimeFields

  return [isoTimeFields, dayDelta]
}

// Epoch Unit Conversion
// -------------------------------------------------------------------------------------------------

// nano -> [micro/milli/sec]

export function epochNanoToSec(epochNano: DayTimeNano): number {
  return dayTimeNanoToNumber(epochNano, nanoInSec)
}

export function epochNanoToSecRemainder(epochNano: DayTimeNano): [number, number] {
  return dayTimeNanoToNumberRemainder(epochNano, nanoInSec)
}

export function epochNanoToMilli(epochNano: DayTimeNano): number {
  return dayTimeNanoToNumber(epochNano, nanoInMilli)
}

function epochNanoToMicro(epochNano: DayTimeNano): bigint {
  return dayTimeNanoToBigInt(epochNano, nanoInMicro)
}

// [micro/milli/sec] -> nano

export function epochMilliToNano(epochMilli: number): DayTimeNano {
  return numberToDayTimeNano(epochMilli, nanoInMilli)
}

// Epoch Getters
// -------------------------------------------------------------------------------------------------

export const epochGetters = {
  epochSeconds: epochNanoToSec,
  epochMilliseconds: epochNanoToMilli,
  epochMicroseconds: epochNanoToMicro,
  epochNanoseconds: dayTimeNanoToBigInt,
}

// ISO <-> Epoch Conversion
// -------------------------------------------------------------------------------------------------

// ISO Fields -> Epoch

export function isoToEpochSec(isoDateTimeFields: IsoDateTimeFields): [number, number] {
  // assume valid
  // TODO: nicer way to splice this (while still excluding subsec)
  const epochSec = isoArgsToEpochSec(
    isoDateTimeFields.isoYear,
    isoDateTimeFields.isoMonth,
    isoDateTimeFields.isoDay,
    isoDateTimeFields.isoHour,
    isoDateTimeFields.isoMinute,
    isoDateTimeFields.isoSecond,
  )

  const subsecNano =
    isoDateTimeFields.isoMillisecond * nanoInMilli +
    isoDateTimeFields.isoMicrosecond * nanoInMicro +
    isoDateTimeFields.isoNanosecond

  return [epochSec, subsecNano]
}

/*
If out-of-bounds, returns undefined
*/
export function isoToEpochMilli(
  isoDateTimeFields: IsoDateTimeFields | IsoDateFields,
): number | undefined {
  return isoArgsToEpochMilli(...pluckIsoTuple(isoDateTimeFields))
}

/*
For converting to fake epochNano values for math
If out-of-bounds, returns undefined
*/
export function isoToEpochNano(
  isoFields: IsoDateTimeFields | IsoDateFields,
): DayTimeNano | undefined {
  const epochMilli = isoToEpochMilli(isoFields)

  if (epochMilli !== undefined) {
    const [days, milliRemainder] = divModTrunc(epochMilli, milliInDay)

    const timeNano =
      milliRemainder * nanoInMilli +
      ((isoFields as IsoDateTimeFields).isoMicrosecond || 0) * nanoInMicro +
      ((isoFields as IsoDateTimeFields).isoNanosecond || 0)

    return [days, timeNano]
  }
}

/*
For converting to proper epochNano values
Ensures in bounds
*/
export function isoToEpochNanoWithOffset(isoFields: IsoDateTimeFields, offsetNano: number): DayTimeNano {
  const [newIsoTimeFields, dayDelta] = nanoToIsoTimeAndDay(isoTimeFieldsToNano(isoFields) - offsetNano)
  const epochNano = isoToEpochNano({
    ...isoFields,
    isoDay: isoFields.isoDay + dayDelta,
    ...newIsoTimeFields,
  })

  return checkEpochNanoInBounds(epochNano)
}

// ISO Arguments -> Epoch

/*
Assumes in-bounds
*/
export function isoArgsToEpochSec(...args: IsoTuple): number {
  return isoArgsToEpochMilli(...args)! / milliInSec
}

/*
If out-of-bounds, returns undefined
*/
export function isoArgsToEpochMilli(...args: IsoTuple): number | undefined {
  const [legacyDate, nudge] = isoToLegacyDate(...args)
  const epochMilli = legacyDate.getTime()

  if (!isNaN(epochMilli)) {
    return epochMilli - nudge * milliInDay
  }
}

function isoToLegacyDate(
  isoYear: number,
  isoMonth: number = 1,
  isoDay: number = 0,
  isoHour: number = 0,
  isoMinute: number = 0,
  isoSec: number = 0,
  isoMilli: number = 0,
): [Date, number] {
  // allows this function to accept values beyond valid Instants
  // (PlainDateTime allows values within 24hrs)
  // TODO: more DRY
  const nudge = isoYear === isoYearMin ? 1 : isoYear === isoYearMax ? -1 : 0

  // Note: Date.UTC() interprets one and two-digit years as being in the
  // 20th century, so don't use it
  const legacyDate = new Date() // should throw out-of-range error here?
  legacyDate.setUTCHours(isoHour, isoMinute, isoSec, isoMilli)
  legacyDate.setUTCFullYear(isoYear, isoMonth - 1, isoDay + nudge)

  return [legacyDate, nudge]
}

// Epoch -> ISO Fields

export function epochNanoToIso(epochNano: DayTimeNano, offsetNano: number): IsoDateTimeFields {
  let [days, timeNano] = addDayTimeNanoAndNumber(epochNano, offsetNano)

  // convert to start-of-day and time-of-day
  if (timeNano < 0) {
    timeNano += nanoInUtcDay
    days -= 1
  }

  const [timeMilli, nanoRemainder] = divModFloor(timeNano, nanoInMilli)
  const [isoMicrosecond, isoNanosecond] = divModFloor(nanoRemainder, nanoInMicro)
  const epochMilli = days * milliInDay + timeMilli

  return {
    ...epochMilliToIso(epochMilli),
    isoMicrosecond,
    isoNanosecond,
  }
}

/*
Given epochMilli assumed to be within PlainDateTime's range
*/
export function epochMilliToIso(epochMilli: number): {
  // return value
  isoYear: number,
  isoMonth: number,
  isoDay: number,
  isoHour: number,
  isoMinute: number,
  isoSecond: number,
  isoMillisecond: number,
} {
  // TODO: use cmp?
  const nudge = epochMilli < -milliInDay * maxDays ? 1 : epochMilli > milliInDay * maxDays ? -1 : 0
  const legacyDate = new Date(epochMilli + nudge * milliInDay)

  return {
    isoYear: legacyDate.getUTCFullYear(),
    isoMonth: legacyDate.getUTCMonth() + 1,
    isoDay: legacyDate.getUTCDate() - nudge, // luckily the days for min/max are in middle of month
    isoHour: legacyDate.getUTCHours(),
    isoMinute: legacyDate.getUTCMinutes(),
    isoSecond: legacyDate.getUTCSeconds(),
    isoMillisecond: legacyDate.getUTCMilliseconds(),
  }
}

// Comparison (low-level)
// -------------------------------------------------------------------------------------------------

export function compareIsoDateTimeFields(
  isoFields0: IsoDateTimeFields,
  isoFields1: IsoDateTimeFields,
): NumSign {
  return compareIsoDateFields(isoFields0, isoFields1) ||
    compareIsoTimeFields(isoFields0, isoFields1)
}

export function compareIsoDateFields(
  isoFields0: IsoDateFields,
  isoFields1: IsoDateFields,
): NumSign {
  return compareNumbers(
    isoToEpochMilli(isoFields0)!,
    isoToEpochMilli(isoFields1)!,
  )
}

export function compareIsoTimeFields(
  isoFields0: IsoTimeFields,
  isoFields1: IsoTimeFields,
): NumSign {
  return compareNumbers(
    isoTimeFieldsToNano(isoFields0),
    isoTimeFieldsToNano(isoFields1),
  )
}

// Moving (would put in move.ts, but circular dep problems -- still??)
// -------------------------------------------------------------------------------------------------

export function moveByIsoDays(
  isoDateFields: IsoDateFields,
  days: number,
): IsoDateFields {
  if (days) {
    isoDateFields = epochMilliToIso(isoToEpochMilli(isoDateFields)! + days * milliInDay)
  }
  return isoDateFields
}
