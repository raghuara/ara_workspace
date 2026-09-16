import { RECURRENCE, WEEKDAYS } from '@/constants/workspaceDomain'

const pad = (value) => String(value).padStart(2, '0')

/** Local-calendar ISO date, unlike toIsoDate which goes through UTC. */
export const localIsoDate = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

export const todayIso = () => localIsoDate(new Date())

const parseLocal = (iso) => {
  const [year, month, day] = String(iso).split('-').map(Number)
  return new Date(year, month - 1, day)
}

const daysInMonth = (year, monthIndex) => new Date(year, monthIndex + 1, 0).getDate()

export const ordinal = (n) => {
  const mod100 = n % 100
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`
  const suffix = { 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] ?? 'th'
  return `${n}${suffix}`
}

export const normaliseSchedule = (schedule = {}) => ({
  frequency: schedule.frequency === RECURRENCE.MONTHLY ? RECURRENCE.MONTHLY : RECURRENCE.WEEKLY,
  weekdays: [...new Set((schedule.weekdays ?? []).map(Number).filter((d) => d >= 0 && d <= 6))],
  monthDays: [...new Set((schedule.monthDays ?? []).map(Number).filter((d) => d >= 1 && d <= 31))].sort((a, b) => a - b),
})

/**
 * Does this rule fire on this calendar date? A monthly date past the end of a
 * short month (e.g. the 31st in April) falls on that month's last day.
 */
export const matchesDate = (schedule, date) => {
  const rule = normaliseSchedule(schedule)
  if (rule.frequency === RECURRENCE.WEEKLY) return rule.weekdays.includes(date.getDay())
  const day = date.getDate()
  const last = daysInMonth(date.getFullYear(), date.getMonth())
  return rule.monthDays.some((wanted) => wanted === day || (wanted > last && day === last))
}

export const isScheduleComplete = (schedule) => {
  const rule = normaliseSchedule(schedule)
  return rule.frequency === RECURRENCE.WEEKLY ? rule.weekdays.length > 0 : rule.monthDays.length > 0
}

/** The next `count` dates (ISO) on or after `from`, respecting an optional end date. */
export const nextOccurrences = (schedule, { from = todayIso(), endDate = null, count = 3 } = {}) => {
  if (!isScheduleComplete(schedule)) return []
  const found = []
  const cursor = parseLocal(from)
  const stop = endDate ? parseLocal(endDate) : null
  for (let step = 0; step < 400 && found.length < count; step += 1) {
    if (stop && cursor > stop) break
    if (matchesDate(schedule, cursor)) found.push(localIsoDate(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return found
}

const joinNames = (names) => {
  if (names.length <= 1) return names[0] ?? ''
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

/** "Every weekday", "Every Monday", "Mondays and Fridays", "Monthly on the 1st and 15th". */
export const describeSchedule = (schedule) => {
  const rule = normaliseSchedule(schedule)
  if (rule.frequency === RECURRENCE.MONTHLY) {
    if (rule.monthDays.length === 0) return 'No dates chosen yet'
    return `Monthly on the ${joinNames(rule.monthDays.map(ordinal))}`
  }
  const days = WEEKDAYS.filter((day) => rule.weekdays.includes(day.value))
  if (days.length === 0) return 'No days chosen yet'
  if (days.length === 7) return 'Every day'
  if (days.length === 6) return `Every day except ${WEEKDAYS.find((day) => !rule.weekdays.includes(day.value)).label}`
  const values = days.map((day) => day.value)
  if (values.length === 5 && [1, 2, 3, 4, 5].every((d) => values.includes(d))) return 'Every weekday'
  if (values.length === 2 && values.includes(6) && values.includes(0)) return 'Every weekend'
  if (days.length === 1) return `Every ${days[0].label}`
  return joinNames(days.map((day) => `${day.label}s`))
}

export const formatShortDay = (iso) => {
  const date = parseLocal(iso)
  return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}
