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
const NOTHING_PICKED = { year: null, month: null }

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
      isCurrentPeriod: isCurrentYear && selectedMonth?.key === todayKey,
      years,
      months,
      monthsFor,
      month: selectedMonth ? selectedMonth.key : 'all',
      selectedMonth,
      yearRange,
      range: selectedMonth ? { from: selectedMonth.from, to: selectedMonth.to } : yearRange,
      periodLabel: selectedMonth ? selectedMonth.label : `FY ${yearLabel}`,
      previous: shift(-1),
      next: shift(1),
      setYear: (next) => remember({ year: next, month: null }),
      setMonth: (key) => remember({ year, month: key }),
      setPeriod: (nextYear, key) => remember({ year: nextYear, month: key }),
      resetToToday: () => remember({ year: currentYear, month: todayKey }),
    }
  }, [own.year, own.month, currentYear, startMonth, todayKey, activeWorkspaceId])

  return <PeriodContext.Provider value={value}>{children}</PeriodContext.Provider>
}
