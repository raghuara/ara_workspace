import { apiRequest, toQueryString } from './httpClient'

export const dashboardService = {
  getOverview: () => apiRequest('/dashboard/overview'),

  getScopeSummary: (workspaceId, { groupId = '', teamId = '' } = {}) =>
    apiRequest(`/workspaces/${encodeURIComponent(workspaceId)}/summary${toQueryString({ groupId, teamId })}`),

  getEmployeeStats: () => apiRequest('/dashboard/employees'),

  getRecentEmployeeActivity: (limit = 6) => apiRequest(`/dashboard/recent-employees${toQueryString({ limit })}`),
}
