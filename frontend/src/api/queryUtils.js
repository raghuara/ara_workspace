export const DEFAULT_PAGE_SIZE = 10

export const paginate = (items, page = 1, pageSize = DEFAULT_PAGE_SIZE) => {
  const safePageSize = Math.max(1, pageSize)
  const totalPages = Math.max(1, Math.ceil(items.length / safePageSize))
  const safePage = Math.min(Math.max(1, page), totalPages)
  const start = (safePage - 1) * safePageSize

  return {
    items: items.slice(start, start + safePageSize),
    total: items.length,
    page: safePage,
    pageSize: safePageSize,
  }
}

export const matchesSearch = (term, ...fields) => {
  if (!term) return true
  const needle = term.trim().toLowerCase()
  if (!needle) return true
  return fields.some((field) => String(field ?? '').toLowerCase().includes(needle))
}

export const byDateAscending = (key) => (a, b) => a[key].localeCompare(b[key])

export const byDateDescending = (key) => (a, b) => b[key].localeCompare(a[key])
