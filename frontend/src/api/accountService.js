import { apiRequest, toQueryString } from './httpClient'

const id = (value) => encodeURIComponent(value)

export const accountService = {
  listAccounts: ({ search, workspaceId } = {}) =>
    apiRequest(`/admin/accounts${toQueryString({ search, workspaceId })}`),

  listUserTypes: () => apiRequest('/admin/accounts/user-types'),

  getAccount: (employeeId) => apiRequest(`/admin/accounts/${id(employeeId)}`),

  createAccount: (payload) => apiRequest('/admin/accounts', { method: 'POST', body: payload }),

  updateAccount: (employeeId, payload) =>
    apiRequest(`/admin/accounts/${id(employeeId)}`, { method: 'PUT', body: payload }),

  resetPassword: (employeeId, payload = {}) =>
    apiRequest(`/admin/accounts/${id(employeeId)}/reset-password`, { method: 'POST', body: payload }),

  changePassword: (payload) => apiRequest('/auth/change-password', { method: 'POST', body: payload }),
}
