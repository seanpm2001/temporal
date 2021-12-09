import { OVERFLOW_CONSTRAIN } from '../argParse/overflowHandling'
import { CalendarImpl } from '../calendarImpl/calendarImpl'
import { Duration } from '../public/duration'
import { compareValues } from '../utils/math'
import { addWholeMonths, addWholeYears } from './add'
import { DateEssentials, compareDateFields, constrainDateFields } from './date'
import { diffDaysMilli } from './isoMath'
import { MONTH, UnitInt, WEEK, YEAR } from './units'

export function diffDateFields(
  d0: DateEssentials,
  d1: DateEssentials,
  calendarImpl: CalendarImpl,
  largestUnit: UnitInt,
): Duration {
  let years = 0; let months = 0; let weeks = 0; let days = 0

  switch (largestUnit) {
    case YEAR:
      years = wholeYearsUntil(d0, d1, calendarImpl)
      d0 = addWholeYears(d0, years, calendarImpl, OVERFLOW_CONSTRAIN)
      // fallthrough
    case MONTH:
      months = wholeMonthsUntil(d0, d1, calendarImpl)
      d0 = addWholeMonths(d0, months, calendarImpl, OVERFLOW_CONSTRAIN)
  }

  days = diffDaysMilli(
    calendarImpl.epochMilliseconds(d0.year, d0.month, d0.day),
    calendarImpl.epochMilliseconds(d1.year, d1.month, d1.day),
  )

  if (largestUnit === WEEK) {
    weeks = Math.trunc(days / 7)
    days %= 7
  }

  return new Duration(years, months, weeks, days)
}

function wholeYearsUntil(
  d0: DateEssentials,
  d1: DateEssentials,
  calendarImpl: CalendarImpl,
): number {
  // simulate destination year
  const [, newMonth, newDay] = constrainDateFields(
    d1.year,
    d0.month,
    d0.day,
    calendarImpl,
    OVERFLOW_CONSTRAIN,
  )

  const generalSign = compareDateFields(d1, d0) || 1
  const monthSign = compareValues(d1.month, newMonth) || compareValues(d1.day, newDay) || 1

  return d1.year - d0.year - (
    monthSign !== generalSign
      ? generalSign
      : 0
  )
}

function wholeMonthsUntil(
  d0: DateEssentials,
  d1: DateEssentials,
  calendarImpl: CalendarImpl,
): number {
  let monthsToAdd = 0
  const generalSign = compareDateFields(d1, d0) || 1

  if (generalSign) {
    // move ahead by whole years
    let { year } = d0
    while (year !== d1.year) {
      monthsToAdd += calendarImpl.monthsInYear(year) * generalSign
      year += generalSign
    }

    // simulate destination year (same as wholeYearsUntil... optimization opportunity?)
    const [, newMonth, newDay] = constrainDateFields(
      d1.year,
      d0.month,
      d0.day,
      calendarImpl,
      OVERFLOW_CONSTRAIN,
    )

    // add remaining months (or subtract overshot months)
    monthsToAdd += d1.month - newMonth

    // correct when we overshoot the day-of-month
    const daySign = compareValues(d1.day, newDay) || 1
    if (daySign === -generalSign) {
      monthsToAdd -= generalSign
    }
  }

  return monthsToAdd
}
