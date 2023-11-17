import { dateGetterRefiners, timeFieldNames } from '../internal/calendarFields'
import { dayTimeNanoToBigInt } from '../internal/dayTimeNano'
import { DurationInternals, durationInternalNames } from '../internal/durationFields'
import { IsoTimeFields, isoTimeFieldNames } from '../internal/isoFields'
import { epochNanoToMicro, epochNanoToMilli, epochNanoToSec } from '../internal/isoMath'
import { mapPropNames } from '../internal/utils'
import { getSpecificSlots, BrandingSlots, CalendarSlots, IsoDateSlots, ZonedDateTimeSlots, EpochSlots, DurationBranding, DurationSlots, PlainDateBranding } from '../internal/slots'
import { getCalendarSlotId } from '../internal/calendarSlot'
import { queryCalendarImpl } from '../internal/calendarImpl'
import { pluckIsoDateInternals } from '../internal/isoInternals'
import { zonedInternalsToIso } from '../internal/timeZoneMath'

// public
import { createPlainDate } from './plainDate'
import { CalendarProtocol } from './calendar'

// TODO: better types
export function createCalendarIdGetterMethods(branding: string): { calendarId(): string } {
  return {
    calendarId() {
      const slots = getSpecificSlots(branding, this) as (BrandingSlots & CalendarSlots)
      return getCalendarSlotId(slots.calendar)
    }
  }
}

export function createCalendarGetterMethods(
  branding: string,
  names: string[]
) {
  return mapPropNames((name, i) => {
    return function (this: any) {
      const slots = getSpecificSlots(branding, this) as (BrandingSlots & IsoDateSlots)
      const { calendar } = slots

      // TODO: make DRY
      return typeof calendar === 'string'
        ? (queryCalendarImpl(calendar) as any)[name](slots)
        : (dateGetterRefiners as any)[name](
            (calendar[name as keyof CalendarProtocol] as any)(
              createPlainDate({
                ...slots,
                branding: PlainDateBranding,
              })
            )
          )
    }
  }, names)
}

// YUCK
export function createZonedCalendarGetterMethods(
  branding: string,
  names: string[]
) {
  return mapPropNames((name, i) => {
    return function (this: any) {
      const slots = getSpecificSlots(branding, this) as ZonedDateTimeSlots
      const { calendar } = slots
      const isoFields = zonedInternalsToIso(slots)

      // TODO: make DRY
      return typeof calendar === 'string'
        ? (queryCalendarImpl(calendar) as any)[name](isoFields)
        : (dateGetterRefiners as any)[name](
            (calendar[name as keyof CalendarProtocol] as any)(
              createPlainDate({
                ...pluckIsoDateInternals(isoFields),
                branding: PlainDateBranding,
              })
            )
          )
    }
  }, names)
}

export function createTimeGetterMethods(branding: string) {
  return mapPropNames((name, i) => {
    return function (this: any) {
      const slots = getSpecificSlots(branding, this) as (BrandingSlots & IsoTimeFields)
      return slots[isoTimeFieldNames[i]]
    }
  }, timeFieldNames)
}

// YUCK
export function createZonedTimeGetterMethods(branding: string) {
  return mapPropNames((name, i) => {
    return function (this: any) {
      const slots = getSpecificSlots(branding, this) as ZonedDateTimeSlots
      return zonedInternalsToIso(slots)[isoTimeFieldNames[i]]
    }
  }, timeFieldNames)
}

export function createEpochGetterMethods(branding: string) {
  return {
    epochSeconds() {
      const slots = getSpecificSlots(branding, this) as (BrandingSlots & EpochSlots)
      return epochNanoToSec(slots.epochNanoseconds)
    },
    epochMilliseconds() {
      const slots = getSpecificSlots(branding, this) as (BrandingSlots & EpochSlots)
      return epochNanoToMilli(slots.epochNanoseconds)
    },
    epochMicroseconds() {
      const slots = getSpecificSlots(branding, this) as (BrandingSlots & EpochSlots)
      return epochNanoToMicro(slots.epochNanoseconds)
    },
    epochNanoseconds() {
      const slots = getSpecificSlots(branding, this) as (BrandingSlots & EpochSlots)
      return dayTimeNanoToBigInt(slots.epochNanoseconds)
    },
  }
}

/*
Includes sign()
*/
export const durationGettersMethods = mapPropNames((propName: keyof DurationInternals) => {
  return function (this: any) {
    const slots = getSpecificSlots(DurationBranding, this) as DurationSlots
    return slots[propName]
  }
}, durationInternalNames)

export function neverValueOf() {
  throw new TypeError('Cannot convert object using valueOf')
}
