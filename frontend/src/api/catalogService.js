import { apiRequest, toQueryString } from './httpClient'

const createCatalogService = (path) => ({
  list: ({ activeOnly = false } = {}) => apiRequest(`${path}${toQueryString({ active: activeOnly ? 'true' : '' })}`),
  create: (payload) => apiRequest(path, { method: 'POST', body: payload }),
  update: (id, payload) => apiRequest(`${path}/${encodeURIComponent(id)}`, { method: 'PUT', body: payload }),
  remove: (id) => apiRequest(`${path}/${encodeURIComponent(id)}`, { method: 'DELETE' }),
})

export const departmentService = createCatalogService('/departments')
export const designationService = createCatalogService('/designations')
