export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

export const DEFAULT_FISCAL_START = 4

const pad = (value) => String(value).padStart(2, '0')

const lastDayOf = (year, month) => new Date(year, month, 0).getDate()

export const normaliseStartMonth = (value) => {
  const month = Number(value)
  return Number.isInteger(month) && month >= 1 && month <= 12 ? month : DEFAULT_FISCAL_START
}

export const endMonthOf = (startMonth) => ((normaliseStartMonth(startMonth) + 10) % 12) + 1

export const fiscalYearOf = (date, startMonth) => {
  const start = normaliseStartMonth(startMonth)
  const month = date.getMonth() + 1
  return month >= start ? date.getFullYear() : date.getFullYear() - 1
}

export const fiscalYearLabel = (startYear, startMonth) =>
  normaliseStartMonth(startMonth) === 1 ? String(startYear) : `${startYear}-${startYear + 1}`

export const fiscalYearMonths = (startYear, startMonth) => {
  const start = normaliseStartMonth(startMonth)
  return Array.from({ length: 12 }, (_, index) => {
    const month = ((start - 1 + index) % 12) + 1
    const year = startYear + Math.floor((start - 1 + index) / 12)
    return {
      key: `${year}-${pad(month)}`,
      year,
      month,
      short: MONTH_NAMES[month - 1].slice(0, 3),
      label: `${MONTH_NAMES[month - 1].slice(0, 3)} ${year}`,
      from: `${year}-${pad(month)}-01`,
      to: `${year}-${pad(month)}-${pad(lastDayOf(year, month))}`,
    }
  })
}

export const fiscalYearRange = (startYear, startMonth) => {
  const months = fiscalYearMonths(startYear, startMonth)
  return { from: months[0].from, to: months[11].to }
}

export const monthKeyOf = (date = new Date()) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}`

export const monthRange = (date = new Date()) => {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  return { from: `${year}-${pad(month)}-01`, to: `${year}-${pad(month)}-${pad(lastDayOf(year, month))}` }
}
