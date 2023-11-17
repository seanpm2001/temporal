import { isoCalendarId } from '../internal/calendarConfig'
import { dateGetterNames } from '../internal/calendarFields'
import {
  convertToPlainMonthDay,
  convertToPlainYearMonth,
  mergeZonedDateTimeBag,
  refineZonedDateTimeBag,
  rejectInvalidBag,
} from '../internal/convert'
import { diffZonedDateTimes } from '../internal/diff'
import { negateDurationInternals } from '../internal/durationFields'
import { LocalesArg, slotsToLocaleString } from '../internal/intlFormat'
import {
  isoTimeFieldDefaults,
  pluckIsoTimeFields,
} from '../internal/isoFields'
import {
  IsoDateTimePublic,
  pluckIsoDateInternals,
  pluckIsoDateTimeInternals
} from '../internal/isoInternals'
import {
  formatOffsetNano,
  formatZonedDateTimeIso,
} from '../internal/isoFormat'
import {
  checkEpochNanoInBounds,
} from '../internal/isoMath'
import { isZonedDateTimesEqual } from '../internal/equality'
import { parseZonedDateTime } from '../internal/isoParse'
import { moveZonedDateTime } from '../internal/move'
import {
  DiffOptions,
  EpochDisambig,
  OffsetDisambig,
  OverflowOptions,
  RoundingOptions,
  ZonedDateTimeDisplayOptions,
  ZonedFieldOptions,
  prepareOptions,
  refineZonedFieldOptions,
} from '../internal/options'
import { roundZonedDateTime } from '../internal/round'
import { UnitName, nanoInHour } from '../internal/units'
import { NumSign, defineGetters, defineProps, defineStringTag, isObjectlike } from '../internal/utils'
import { bigIntToDayTimeNano, compareDayTimeNanos } from '../internal/dayTimeNano'
import { ensureString, toBigInt } from '../internal/cast'
import { CalendarBranding, DurationBranding, InstantBranding, PlainDateBranding, PlainDateTimeBranding, PlainMonthDayBranding, PlainTimeBranding, PlainYearMonthBranding, TimeZoneBranding, ZonedDateTimeBranding, ZonedDateTimeSlots, createViaSlots, getSlots, getSpecificSlots, setSlots } from '../internal/slots'
import { getPreferredCalendarSlot, refineCalendarSlot } from '../internal/calendarSlot'
import { TimeZoneSlot, getTimeZoneSlotId, refineTimeZoneSlot } from '../internal/timeZoneSlot'
import { computeNanosecondsInDay, getMatchingInstantFor, zonedInternalsToIso } from '../internal/timeZoneMath'
import { timeZoneImplGetOffsetNanosecondsFor, timeZoneImplGetPossibleInstantsFor } from '../internal/timeZoneRecordSimple'

// public
import { CalendarArg, CalendarProtocol, createCalendar } from './calendar'
import { Duration, DurationArg, createDuration, toDurationSlots } from './duration'
import { Instant, createInstant } from './instant'
import { PlainDate, PlainDateArg, createPlainDate, toPlainDateSlots } from './plainDate'
import { PlainDateTime, PlainDateTimeBag, PlainDateTimeMod, createPlainDateTime } from './plainDateTime'
import { PlainMonthDay, createPlainMonthDay } from './plainMonthDay'
import { PlainTime, PlainTimeArg, createPlainTime } from './plainTime'
import { PlainYearMonth, createPlainYearMonth } from './plainYearMonth'
import { TimeZoneArg, TimeZoneProtocol, createTimeZone } from './timeZone'
import { createCalendarIdGetterMethods, createEpochGetterMethods, createZonedCalendarGetterMethods, createZonedTimeGetterMethods, neverValueOf } from './publicMixins'
import { optionalToPlainTimeFields } from './publicUtils'
import { createTimeZoneSlotRecord, timeZoneProtocolGetOffsetNanosecondsFor, timeZoneProtocolGetPossibleInstantsFor } from './timeZoneRecordComplex'

export type ZonedDateTimeBag = PlainDateTimeBag & { timeZone: TimeZoneArg, offset?: string }
export type ZonedDateTimeMod = PlainDateTimeMod
export type ZonedDateTimeArg = ZonedDateTime | ZonedDateTimeBag | string

// TODO: make DRY with TimeZoneArg (it's a subset)
export type ZonedPublic = IsoDateTimePublic & { timeZone: TimeZoneSlot, offset: string }

export class ZonedDateTime {
  constructor(
    epochNano: bigint,
    timeZoneArg: TimeZoneArg,
    calendarArg: CalendarArg = isoCalendarId,
  ) {
    setSlots(this, {
      branding: ZonedDateTimeBranding,
      epochNanoseconds: checkEpochNanoInBounds(bigIntToDayTimeNano(toBigInt(epochNano))),
      timeZone: refineTimeZoneSlot(timeZoneArg), // TODO: validate string/object somehow?
      calendar: refineCalendarSlot(calendarArg),
    } as ZonedDateTimeSlots)
  }

  with(mod: ZonedDateTimeMod, options?: ZonedFieldOptions): ZonedDateTime {
    getZonedDateTimeSlots(this) // validate `this`
    return createZonedDateTime({
      branding: ZonedDateTimeBranding,
      ...mergeZonedDateTimeBag(this, rejectInvalidBag(mod), prepareOptions(options))
    })
  }

  withPlainTime( plainTimeArg?: PlainTimeArg): ZonedDateTime {
    const isoTimeFields = optionalToPlainTimeFields(plainTimeArg) // must be parsed first
    const slots = getZonedDateTimeSlots(this)

    const { calendar, timeZone } = slots
    const timeZoneRecord = createTimeZoneSlotRecord(timeZone, {
      getOffsetNanosecondsFor: timeZoneImplGetOffsetNanosecondsFor,
      getPossibleInstantsFor: timeZoneImplGetPossibleInstantsFor,
    }, {
      getOffsetNanosecondsFor: timeZoneProtocolGetOffsetNanosecondsFor,
      getPossibleInstantsFor: timeZoneProtocolGetPossibleInstantsFor,
    })

    const isoFields = {
      ...zonedInternalsToIso(slots),
      ...isoTimeFields,
    }

    const epochNano = getMatchingInstantFor(
      timeZoneRecord,
      isoFields,
      isoFields.offsetNanoseconds,
      false, // hasZ
      OffsetDisambig.Prefer, // OffsetDisambig
      undefined, // EpochDisambig
      false, // fuzzy
    )

    return createZonedDateTime({
      branding: ZonedDateTimeBranding,
      epochNanoseconds: epochNano,
      timeZone,
      calendar,
    })
  }

  // TODO: more DRY with withPlainTime and zonedDateTimeWithBag?
  withPlainDate(plainDateArg: PlainDateArg): ZonedDateTime {
    const slots = getZonedDateTimeSlots(this)

    const { timeZone } = slots
    const timeZoneRecord = createTimeZoneSlotRecord(timeZone, {
      getOffsetNanosecondsFor: timeZoneImplGetOffsetNanosecondsFor,
      getPossibleInstantsFor: timeZoneImplGetPossibleInstantsFor,
    }, {
      getOffsetNanosecondsFor: timeZoneProtocolGetOffsetNanosecondsFor,
      getPossibleInstantsFor: timeZoneProtocolGetPossibleInstantsFor,
    })

    const plainDateSlots = toPlainDateSlots(plainDateArg)
    const isoFields = {
      ...zonedInternalsToIso(slots),
      ...plainDateSlots,
    }
    const calendar = getPreferredCalendarSlot(slots.calendar, plainDateSlots.calendar)

    const epochNano = getMatchingInstantFor(
      timeZoneRecord,
      isoFields,
      isoFields.offsetNanoseconds,
      false, // hasZ
      OffsetDisambig.Prefer, // OffsetDisambig
      undefined, // EpochDisambig
      false, // fuzzy
    )

    return createZonedDateTime({
      branding: ZonedDateTimeBranding,
      epochNanoseconds: epochNano,
      timeZone,
      calendar,
    })
  }

  withTimeZone(timeZoneArg: TimeZoneArg): ZonedDateTime {
    return createZonedDateTime({
      ...getZonedDateTimeSlots(this),
      timeZone: refineTimeZoneSlot(timeZoneArg),
    })
  }

  withCalendar(calendarArg: CalendarArg): ZonedDateTime {
    return createZonedDateTime({
      ...getZonedDateTimeSlots(this),
      calendar: refineCalendarSlot(calendarArg),
    })
  }

  add(durationArg: DurationArg, options?: OverflowOptions): ZonedDateTime {
    return createZonedDateTime({
      branding: ZonedDateTimeBranding,
      ...moveZonedDateTime(
        getZonedDateTimeSlots(this),
        toDurationSlots(durationArg),
        options,
      ),
    })
  }

  subtract(durationArg: DurationArg, options?: OverflowOptions): ZonedDateTime {
    return createZonedDateTime({
      branding: ZonedDateTimeBranding,
      ...moveZonedDateTime(
        getZonedDateTimeSlots(this),
        negateDurationInternals(toDurationSlots(durationArg)),
        options,
      ),
    })
  }

  until(otherArg: ZonedDateTimeArg, options?: DiffOptions): Duration {
    return createDuration({
      branding: DurationBranding,
      ...diffZonedDateTimes(getZonedDateTimeSlots(this), toZonedDateTimeSlots(otherArg), options)
    })
  }

  since(otherArg: ZonedDateTimeArg, options?: DiffOptions): Duration {
    return createDuration({
      branding: DurationBranding,
      ...diffZonedDateTimes(getZonedDateTimeSlots(this), toZonedDateTimeSlots(otherArg), options, true)
    })
  }

  /*
  Do param-list destructuring here and other methods!
  */
  round(options: RoundingOptions | UnitName): ZonedDateTime {
    return createZonedDateTime({
      branding: ZonedDateTimeBranding,
      ...roundZonedDateTime(getZonedDateTimeSlots(this), options)
    })
  }

  startOfDay(): ZonedDateTime {
    const slots = getZonedDateTimeSlots(this)

    let { epochNanoseconds, timeZone, calendar } = slots
    const timeZoneRecord = createTimeZoneSlotRecord(timeZone, {
      getOffsetNanosecondsFor: timeZoneImplGetOffsetNanosecondsFor,
      getPossibleInstantsFor: timeZoneImplGetPossibleInstantsFor,
    }, {
      getOffsetNanosecondsFor: timeZoneProtocolGetOffsetNanosecondsFor,
      getPossibleInstantsFor: timeZoneProtocolGetPossibleInstantsFor,
    })

    const isoFields = {
      ...zonedInternalsToIso(slots),
      ...isoTimeFieldDefaults,
    }

    epochNanoseconds = getMatchingInstantFor(
      timeZoneRecord,
      isoFields,
      undefined, // offsetNanoseconds
      false, // z
      OffsetDisambig.Reject,
      EpochDisambig.Compat,
      true, // fuzzy
    )

    return createZonedDateTime({
      branding: ZonedDateTimeBranding,
      epochNanoseconds,
      timeZone,
      calendar,
    })
  }

  equals(otherArg: ZonedDateTimeArg): boolean {
    return isZonedDateTimesEqual(getZonedDateTimeSlots(this), toZonedDateTimeSlots(otherArg))
  }

  // TODO: more DRY with Instant::toString
  toString(options?: ZonedDateTimeDisplayOptions): string {
    return formatZonedDateTimeIso(getZonedDateTimeSlots(this), options)
  }

  toJSON(): string {
    return formatZonedDateTimeIso(getZonedDateTimeSlots(this))
  }

  toLocaleString(locales: LocalesArg, options: Intl.DateTimeFormatOptions = {}) {
    const slots = getZonedDateTimeSlots(this)

    // Copy options so accessing doesn't cause side-effects
    // TODO: stop this from happening twice, in slotsToLocaleString too
    options = { ...options }

    if ('timeZone' in options) {
      throw new TypeError('Cannot specify TimeZone')
    }

    return slotsToLocaleString(slots, locales, options)
  }

  toInstant(): Instant {
    return createInstant({
      branding: InstantBranding,
      epochNanoseconds: getZonedDateTimeSlots(this).epochNanoseconds
    })
  }

  toPlainDate(): PlainDate {
    return createPlainDate({
      ...pluckIsoDateInternals(zonedInternalsToIso(getZonedDateTimeSlots(this))),
      branding: PlainDateBranding,
    })
  }

  toPlainTime(): PlainTime {
    return createPlainTime({
      ...pluckIsoTimeFields(zonedInternalsToIso(getZonedDateTimeSlots(this))),
      branding: PlainTimeBranding,
    })
  }

  toPlainDateTime(): PlainDateTime {
    return createPlainDateTime({
      ...pluckIsoDateTimeInternals(zonedInternalsToIso(getZonedDateTimeSlots(this))),
      branding: PlainDateTimeBranding,
    })
  }

  toPlainYearMonth(): PlainYearMonth {
    getZonedDateTimeSlots(this) // validate `this` // TODO: make sure all other classes do same
    return createPlainYearMonth({
      branding: PlainYearMonthBranding,
      ...convertToPlainYearMonth(this),
    })
  }

  toPlainMonthDay(): PlainMonthDay {
    getZonedDateTimeSlots(this) // validate `this`
    return createPlainMonthDay({
      branding: PlainMonthDayBranding,
      ...convertToPlainMonthDay(this),
    })
  }

  getISOFields(): ZonedPublic {
    const slots = getZonedDateTimeSlots(this)
    return {
      ...pluckIsoDateTimeInternals(zonedInternalsToIso(slots)),
      // alphabetical
      calendar: slots.calendar,
      offset: formatOffsetNano(
        // TODO: more DRY
        zonedInternalsToIso(slots).offsetNanoseconds,
      ),
      timeZone: slots.timeZone,
    }
  }

  getCalendar(): CalendarProtocol {
    const { calendar } = getZonedDateTimeSlots(this)
    return typeof calendar === 'string'
      ? createCalendar({ branding: CalendarBranding, id: calendar })
      : calendar
  }

  // not DRY?
  getTimeZone(): TimeZoneProtocol {
    const { timeZone } = getZonedDateTimeSlots(this)
    return typeof timeZone === 'string'
      ? createTimeZone({ branding: TimeZoneBranding, id: timeZone })
      : timeZone
  }

  get hoursInDay(): number {
    const slots = getZonedDateTimeSlots(this)

    const timeZoneRecord = createTimeZoneSlotRecord(slots.timeZone, {
      getOffsetNanosecondsFor: timeZoneImplGetOffsetNanosecondsFor,
      getPossibleInstantsFor: timeZoneImplGetPossibleInstantsFor,
    }, {
      getOffsetNanosecondsFor: timeZoneProtocolGetOffsetNanosecondsFor,
      getPossibleInstantsFor: timeZoneProtocolGetPossibleInstantsFor,
    })

    return computeNanosecondsInDay(
      timeZoneRecord,
      zonedInternalsToIso(slots),
    ) / nanoInHour
  }

  // TODO: more DRY
  get offsetNanoseconds(): number {
    return zonedInternalsToIso(getZonedDateTimeSlots(this)).offsetNanoseconds
  }

  // TODO: more DRY
  get offset(): string {
    return formatOffsetNano(
      zonedInternalsToIso(getZonedDateTimeSlots(this)).offsetNanoseconds,
    )
  }

  get timeZoneId(): string {
    return getTimeZoneSlotId(getZonedDateTimeSlots(this).timeZone)
  }

  static from(arg: any, options?: ZonedFieldOptions) {
    return createZonedDateTime(toZonedDateTimeSlots(arg, options))
  }

  static compare(arg0: ZonedDateTimeArg, arg1: ZonedDateTimeArg): NumSign {
    return compareDayTimeNanos(
      toZonedDateTimeSlots(arg0).epochNanoseconds,
      toZonedDateTimeSlots(arg1).epochNanoseconds,
    )
  }
}

defineStringTag(ZonedDateTime.prototype, ZonedDateTimeBranding)

defineProps(ZonedDateTime.prototype, {
  valueOf: neverValueOf,
})

defineGetters(ZonedDateTime.prototype, {
  ...createCalendarIdGetterMethods(ZonedDateTimeBranding),
  ...createZonedCalendarGetterMethods(ZonedDateTimeBranding, dateGetterNames),
  ...createZonedTimeGetterMethods(ZonedDateTimeBranding),
  ...createEpochGetterMethods(ZonedDateTimeBranding),
})

// Utils
// -------------------------------------------------------------------------------------------------

export function createZonedDateTime(slots: ZonedDateTimeSlots): ZonedDateTime {
  return createViaSlots(ZonedDateTime, slots)
}

export function getZonedDateTimeSlots(zonedDateTime: ZonedDateTime): ZonedDateTimeSlots {
  return getSpecificSlots(ZonedDateTimeBranding, zonedDateTime) as ZonedDateTimeSlots
}

export function toZonedDateTimeSlots(arg: ZonedDateTimeArg, options?: ZonedFieldOptions): ZonedDateTimeSlots {
  options = prepareOptions(options)

  if (isObjectlike(arg)) {
    const slots = getSlots(arg)
    if (slots && slots.branding === ZonedDateTimeBranding) {
      refineZonedFieldOptions(options) // parse unused options
      return slots as ZonedDateTimeSlots
    }
    return { ...refineZonedDateTimeBag(arg as any, options), branding: ZonedDateTimeBranding }
  }

  return { ...parseZonedDateTime(ensureString(arg), options), branding: ZonedDateTimeBranding }
}
