import { useMemo, useState } from 'react'
import { useWorkspace } from '@/hooks/useWorkspace'
import {
  MONTH_NAMES,
  endMonthOf,
  fiscalYearLabel,
  fiscalYearMonths,
  fiscalYearOf,
  fiscalYearRange,
  monthKeyOf,
  normaliseStartMonth,
} from '@/utils/fiscalYear'
import { PeriodContext } from './periodContext'

const YEARS_BACK = 4
const NOTHING_PICKED = { year: null, month: null, day: null, custom: null }

const isoOf = (date) => date.toISOString().slice(0, 10)

const addDays = (iso, delta) => {
  const date = new Date(`${iso}T12:00:00`)
  date.setDate(date.getDate() + delta)
  return isoOf(date)
}

const dayLabel = (iso) => {
  const date = new Date(`${iso}T12:00:00`)
  return `${date.getDate()} ${MONTH_NAMES[date.getMonth()].slice(0, 3)} ${date.getFullYear()}`
}

export const PeriodProvider = ({ children }) => {
  const { activeWorkspace, activeWorkspaceId } = useWorkspace()
  const startMonth = normaliseStartMonth(activeWorkspace?.fiscalYearStartMonth)
  const todayKey = monthKeyOf(new Date())
  const currentYear = fiscalYearOf(new Date(), startMonth)

  const [picks, setPicks] = useState({})
  const own = picks[activeWorkspaceId] ?? NOTHING_PICKED

  const value = useMemo(() => {
    const years = Array.from({ length: YEARS_BACK + 1 }, (_, index) => currentYear - index)
    const oldestYear = years[years.length - 1]
    const monthsFor = (fiscalYear) =>
      fiscalYearMonths(fiscalYear, startMonth).map((month) => ({
        ...month,
        disabled: month.key > todayKey,
        isCurrent: month.key === todayKey,
      }))

    const year = years.includes(own.year) ? own.year : currentYear
    const isCurrentYear = year === currentYear
    const months = monthsFor(year)
    const defaultMonth = isCurrentYear ? todayKey : 'all'
    const pickedMonthValid = own.month === 'all' || months.some((month) => month.key === own.month && !month.disabled)
    const wanted = pickedMonthValid ? own.month : defaultMonth
    const selectedMonth = months.find((month) => month.key === wanted) ?? null
    const yearRange = fiscalYearRange(year, startMonth)
    const yearLabel = fiscalYearLabel(year, startMonth)

    const shift = (delta) => {
      if (!selectedMonth) {
        const target = year + delta
        return years.includes(target)
          ? { year: target, month: 'all', label: `FY ${fiscalYearLabel(target, startMonth)}` }
          : null
      }
      const index = months.findIndex((month) => month.key === selectedMonth.key) + delta
      const targetYear = index < 0 ? year - 1 : index > 11 ? year + 1 : year
      if (!years.includes(targetYear)) return null
      const target = (targetYear === year ? months : monthsFor(targetYear))[(index + 12) % 12]
      return target.disabled ? null : { year: targetYear, month: target.key, label: target.label }
    }

    const remember = (pick) => setPicks((current) => ({ ...current, [activeWorkspaceId]: pick }))

    // A single day sits on top of the month: same provider, narrower range, so
    // every page that already reads `range` filters to that day untouched.
    const today = isoOf(new Date())
    const day = own.day && own.day <= today && own.day >= yearRange.from && own.day <= yearRange.to ? own.day : null

    // A free range (this week, month to date, anything hand-picked) overrides
    // the month without replacing it, so clearing it falls back to the month.
    const custom =
      own.custom && own.custom.from && own.custom.to && own.custom.from <= own.custom.to ? own.custom : null

    const pickDay = (iso) => {
      if (!iso) return remember({ year, month: own.month, day: null, custom: null })
      const date = new Date(`${iso}T12:00:00`)
      return remember({ year: fiscalYearOf(date, startMonth), month: monthKeyOf(date), day: iso, custom: null })
    }

    const pickRange = (from, to, rangeLabel) =>
      remember({ year, month: own.month, day: null, custom: { from, to, label: rangeLabel } })

    const stepDay = (delta) => {
      const target = addDays(day, delta)
      if (target > today || target < fiscalYearRange(oldestYear, startMonth).from) return null
      return { year, month: own.month, day: target, label: dayLabel(target) }
    }

    return {
      startMonth,
      startMonthName: MONTH_NAMES[startMonth - 1],
      endMonthName: MONTH_NAMES[endMonthOf(startMonth) - 1],
      todayKey,
      year,
      yearLabel,
      currentYear,
      oldestYear,
      isCurrentYear,
      isCurrentPeriod: custom ? false : day ? day === today : isCurrentYear && selectedMonth?.key === todayKey,
      day,
      today,
      dayLabel,
      custom,
      setDay: pickDay,
      setRange: pickRange,
      clearDay: () => remember({ year, month: own.month, day: null, custom: null }),
      years,
      months,
      monthsFor,
      month: selectedMonth ? selectedMonth.key : 'all',
      selectedMonth,
      yearRange,
      range: custom
        ? { from: custom.from, to: custom.to }
        : day
          ? { from: day, to: day }
          : selectedMonth
            ? { from: selectedMonth.from, to: selectedMonth.to }
            : yearRange,
      periodLabel: custom ? custom.label : day ? dayLabel(day) : selectedMonth ? selectedMonth.label : `FY ${yearLabel}`,
      previous: custom ? null : day ? stepDay(-1) : shift(-1),
      next: custom ? null : day ? stepDay(1) : shift(1),
      setYear: (next) => remember({ year: next, month: null, day: null, custom: null }),
      setMonth: (key) => remember({ year, month: key, day: null, custom: null }),
      setPeriod: (nextYear, key, nextDay = null) =>
        remember({ year: nextYear, month: key, day: nextDay, custom: null }),
      resetToToday: () => remember({ year: currentYear, month: todayKey, day: null, custom: null }),
    }
  }, [own.year, own.month, own.day, own.custom, currentYear, startMonth, todayKey, activeWorkspaceId])

  return <PeriodContext.Provider value={value}>{children}</PeriodContext.Provider>
}
