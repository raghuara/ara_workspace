const currencyFormatter = new Intl.NumberFormat('en-LK', {
  style: 'currency',
  currency: 'LKR',
  maximumFractionDigits: 0,
})

export const formatCurrency = (value, currency = 'LKR') => {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—'
  if (currency === 'LKR') return currencyFormatter.format(value)
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value)
}

export const formatNumber = (value) =>
  typeof value === 'number' && !Number.isNaN(value) ? new Intl.NumberFormat('en-US').format(value) : '—'

export const formatPercent = (value, fractionDigits = 1) =>
  typeof value === 'number' && !Number.isNaN(value) ? `${value.toFixed(fractionDigits)}%` : '—'

export const getInitials = (name) => {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? '') : ''
  return `${first}${last}`.toUpperCase()
}

export const pluralize = (count, singular, plural = `${singular}s`) =>
  `${count} ${count === 1 ? singular : plural}`
