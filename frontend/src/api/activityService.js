import { apiRequest, toQueryString } from './httpClient'
import { DEFAULT_PAGE_SIZE } from './queryUtils'

export const activityService = {
  listActivity: ({ workspaceId, search, action, actorId, page = 1, pageSize = DEFAULT_PAGE_SIZE } = {}) =>
    apiRequest(`/activity${toQueryString({ workspaceId, search, action, actorId, page, pageSize })}`),

  listActors: (workspaceId) => apiRequest(`/activity/actors${toQueryString({ workspaceId })}`),
}
