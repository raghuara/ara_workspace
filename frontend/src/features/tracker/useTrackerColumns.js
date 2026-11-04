import { useCallback, useState } from 'react'
import { DEFAULT_METRICS, METRIC_KEYS } from './trackerModel'

const STORAGE_KEY = 'ara.dailyTracker.columns'

const sanitize = (value) => {
  if (!Array.isArray(value)) return DEFAULT_METRICS
  const known = METRIC_KEYS.filter((key) => value.includes(key))
  return known.length > 0 ? known : DEFAULT_METRICS
}

const readStored = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? sanitize(JSON.parse(raw)) : DEFAULT_METRICS
  } catch {
    return DEFAULT_METRICS
  }
}

export const useTrackerColumns = () => {
  const [selected, setSelected] = useState(readStored)

  const save = useCallback((next) => {
    const clean = sanitize(next)
    setSelected(clean)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(clean))
    } catch {
      return
    }
  }, [])

  return [selected, save]
}
