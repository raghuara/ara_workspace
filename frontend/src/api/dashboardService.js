import { apiRequest, toQueryString } from './httpClient'
import { activityService } from './activityService'
import { taskService } from './taskService'

const ACTIVITY_PAGE = 100

export const dashboardService = {
  /**
   * Tasks from several workspaces in one go, each tagged with the workspace it
   * came from. The API is per workspace, so the dashboard asks for them side by
   * side and a workspace that fails is skipped rather than failing the lot.
   */
  collectTasks: async (workspaceIds = [], filters = {}) => {
    const ids = [...new Set(workspaceIds.filter(Boolean))]
    if (ids.length === 0) return []

    const lists = await Promise.all(ids.map((id) => taskService.listTasks(id, filters).catch(() => [])))
    return lists.flatMap((tasks, index) => tasks.map((task) => ({ ...task, workspaceId: task.workspaceId ?? ids[index] })))
  },

  /**
   * Activity for a period in one go. The API pages at 100, so the first page
   * says how many there are and the rest are fetched side by side, up to a cap
   * that keeps a busy month from pulling thousands of rows.
   */
  collectActivity: async (filters = {}, maxPages = 10) => {
    const first = await activityService.listActivity({ ...filters, page: 1, pageSize: ACTIVITY_PAGE })
    const items = [...(first.items ?? [])]
    const total = first.total ?? items.length
    const pages = Math.min(maxPages, Math.ceil(total / ACTIVITY_PAGE))

    const rest = await Promise.all(
      Array.from({ length: Math.max(0, pages - 1) }, (_, index) =>
        activityService
          .listActivity({ ...filters, page: index + 2, pageSize: ACTIVITY_PAGE })
          .catch(() => ({ items: [] })),
      ),
    )
    rest.forEach((page) => items.push(...(page.items ?? [])))

    return { items, total, truncated: total > items.length }
  },

  getOverview: ({ from = '', to = '' } = {}) => apiRequest(`/dashboard/overview${toQueryString({ from, to })}`),

  getScopeSummary: (workspaceId, { groupId = '', teamId = '', from = '', to = '' } = {}) =>
    apiRequest(`/workspaces/${encodeURIComponent(workspaceId)}/summary${toQueryString({ groupId, teamId, from, to })}`),

  getEmployeeStats: () => apiRequest('/dashboard/employees'),

  getRecentEmployeeActivity: (limit = 6) => apiRequest(`/dashboard/recent-employees${toQueryString({ limit })}`),
}
