import { apiRequest, toQueryString } from './httpClient'

export const departmentService = {
  listDepartments: ({ activeOnly = false } = {}) =>
    apiRequest(`/departments${toQueryString({ active: activeOnly ? 'true' : '' })}`),

  createDepartment: (payload) => apiRequest('/departments', { method: 'POST', body: payload }),

  updateDepartment: (departmentId, payload) =>
    apiRequest(`/departments/${encodeURIComponent(departmentId)}`, { method: 'PUT', body: payload }),

  deleteDepartment: (departmentId) =>
    apiRequest(`/departments/${encodeURIComponent(departmentId)}`, { method: 'DELETE' }),
}
