import { isoCalendarId } from './calendarConfig'
import { toCalendarNameOption } from './options'

export function formatPossibleDate(internals, options, formatSimple) {
  const calendarNameOpt = toCalendarNameOption(options)
  const showCalendar =
    calendarNameOpt === 'always' ||
    calendarNameOpt === 'critical' ||
    String(internals.calendar) !== isoCalendarId

  if (showCalendar) {
    return formatIsoDateFields(internals) +
      formatCalendarWithSingleOpt(internals.calendar, calendarNameOpt)
  } else {
    return formatSimple(internals)
  }
}

export function formatIsoDateTimeFields(isoDateTimeFields, options) {
  return formatIsoDateFields(isoDateTimeFields) +
    'T' + formatIsoTimeFields(isoDateTimeFields, options)
}

export function formatIsoDateFields(isoDateFields) {

}

export function formatIsoYearMonthFields(isoDateFields) {

}

export function formatIsoMonthDayFields(isoDateFields) {

}

export function formatIsoTimeFields(isoTimeFields, options) {

}

export function formatOffsetNanoseconds(offsetNanoseconds) {

}

export function formatTimeZone(timeZoneProtocol, options) {

}

export function formatCalendar(calendarProtocol, options) {
  return formatCalendarWithSingleOpt(calendarProtocol, toCalendarNameOption(options))
}

function formatCalendarWithSingleOpt(calendarProtocol, calendarNameOpt) {

}

export function formatDurationInternals(durationInternals, options) {

}
