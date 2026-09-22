import { useContext } from 'react'
import { PeriodContext } from '@/features/workspace/periodContext'

export const usePeriod = () => {
  const context = useContext(PeriodContext)
  if (!context) throw new Error('usePeriod must be used inside a PeriodProvider')
  return context
}
