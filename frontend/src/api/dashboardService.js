import { apiRequest, toQueryString } from './httpClient'

export const dashboardService = {
  getOverview: ({ from = '', to = '' } = {}) => apiRequest(`/dashboard/overview${toQueryString({ from, to })}`),

  getScopeSummary: (workspaceId, { groupId = '', teamId = '', from = '', to = '' } = {}) =>
    apiRequest(`/workspaces/${encodeURIComponent(workspaceId)}/summary${toQueryString({ groupId, teamId, from, to })}`),

  getEmployeeStats: () => apiRequest('/dashboard/employees'),

  getRecentEmployeeActivity: (limit = 6) => apiRequest(`/dashboard/recent-employees${toQueryString({ limit })}`),
}
