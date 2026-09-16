import { apiRequest } from './httpClient'

const id = (value) => encodeURIComponent(value)

export const adminService = {
  listUserTypes: () => apiRequest('/admin/user-types'),

  listUserTypeMembers: (userTypeId) => apiRequest(`/admin/user-types/${id(userTypeId)}/members`),

  duplicateUserType: (userTypeId) => apiRequest(`/admin/user-types/${id(userTypeId)}/duplicate`, { method: 'POST' }),

  createUserType: (payload) => apiRequest('/admin/user-types', { method: 'POST', body: payload }),

  updateUserType: (userTypeId, payload) =>
    apiRequest(`/admin/user-types/${id(userTypeId)}`, { method: 'PUT', body: payload }),

  deleteUserType: (userTypeId) => apiRequest(`/admin/user-types/${id(userTypeId)}`, { method: 'DELETE' }),

  getFeatureAccess: () => apiRequest('/admin/features'),

  setFeature: (featureKey, enabled) =>
    apiRequest(`/admin/features/${id(featureKey)}`, { method: 'PUT', body: { enabled } }),

  getAutomations: () => apiRequest('/admin/automations'),

  setAutomation: (ruleId, enabled) =>
    apiRequest(`/admin/automations/${id(ruleId)}`, { method: 'PUT', body: { enabled } }),
}
