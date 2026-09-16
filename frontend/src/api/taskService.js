import { apiRequest, toQueryString } from './httpClient'

const id = (value) => encodeURIComponent(value)

export const taskService = {
  getBoard: (workspaceId, filters = {}) =>
    apiRequest(`/workspaces/${id(workspaceId)}/board${toQueryString(filters)}`),

  listTasks: (workspaceId, filters = {}) =>
    apiRequest(`/workspaces/${id(workspaceId)}/tasks${toQueryString(filters)}`),

  getTask: (taskId) => apiRequest(`/tasks/${id(taskId)}`),

  createTask: (workspaceId, payload) =>
    apiRequest(`/workspaces/${id(workspaceId)}/tasks`, { method: 'POST', body: payload }),

  updateTask: (taskId, payload) => apiRequest(`/tasks/${id(taskId)}`, { method: 'PUT', body: payload }),

  moveTask: (taskId, statusId) => apiRequest(`/tasks/${id(taskId)}/move`, { method: 'POST', body: { statusId } }),

  deleteTask: (taskId) => apiRequest(`/tasks/${id(taskId)}`, { method: 'DELETE' }),

  getTaskHistory: (taskId) => apiRequest(`/tasks/${id(taskId)}/history`),

  getWorkloadReport: (workspaceId, filters = {}) =>
    apiRequest(`/workspaces/${id(workspaceId)}/workload${toQueryString(filters)}`),
}
