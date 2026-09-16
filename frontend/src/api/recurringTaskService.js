import { apiRequest, toQueryString } from './httpClient'

const id = (value) => encodeURIComponent(value)

/**
 * A recurring task is a template plus a schedule. The backend creates the real
 * tasks from it each day (see automation rule `recurring-tasks`); the frontend
 * only manages the rules.
 *
 * Rule shape:
 * { id, workspaceId, groupId, teamId, clientId, title, description, priority,
 *   sizeKey, points, assigneeIds, assignees: [{ id, fullName }], perAssignee,
 *   schedule: { frequency: 'weekly' | 'monthly', weekdays: [0-6], monthDays: [1-31] },
 *   dueOffsetDays, startDate, endDate, isActive, lastRunOn, nextRunOn,
 *   createdCount, createdById, createdByName, createdAt,
 *   clientName, clientTone, groupName, groupTone, teamName }
 */
export const recurringTaskService = {
  list: (workspaceId, filters = {}) =>
    apiRequest(`/workspaces/${id(workspaceId)}/recurring-tasks${toQueryString(filters)}`),

  get: (ruleId) => apiRequest(`/recurring-tasks/${id(ruleId)}`),

  create: (workspaceId, payload) =>
    apiRequest(`/workspaces/${id(workspaceId)}/recurring-tasks`, { method: 'POST', body: payload }),

  update: (ruleId, payload) => apiRequest(`/recurring-tasks/${id(ruleId)}`, { method: 'PUT', body: payload }),

  setActive: (ruleId, isActive) =>
    apiRequest(`/recurring-tasks/${id(ruleId)}/status`, { method: 'POST', body: { isActive } }),

  remove: (ruleId) => apiRequest(`/recurring-tasks/${id(ruleId)}`, { method: 'DELETE' }),
}
