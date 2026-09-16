import { apiRequest } from './httpClient'

const id = (value) => encodeURIComponent(value)

export const workspaceService = {
  listWorkspaces: () => apiRequest('/workspaces'),

  getWorkspace: (workspaceId) => apiRequest(`/workspaces/${id(workspaceId)}`),

  createWorkspace: (payload) => apiRequest('/workspaces', { method: 'POST', body: payload }),

  updateWorkspace: (workspaceId, payload) =>
    apiRequest(`/workspaces/${id(workspaceId)}`, { method: 'PUT', body: payload }),

  deleteWorkspace: (workspaceId) => apiRequest(`/workspaces/${id(workspaceId)}`, { method: 'DELETE' }),

  listStructure: (workspaceId) => apiRequest(`/workspaces/${id(workspaceId)}/structure`),

  createGroup: (workspaceId, payload) =>
    apiRequest(`/workspaces/${id(workspaceId)}/groups`, { method: 'POST', body: payload }),

  updateGroup: (groupId, payload) => apiRequest(`/groups/${id(groupId)}`, { method: 'PUT', body: payload }),

  deleteGroup: (groupId) => apiRequest(`/groups/${id(groupId)}`, { method: 'DELETE' }),

  createTeam: (groupId, payload) => apiRequest(`/groups/${id(groupId)}/teams`, { method: 'POST', body: payload }),

  updateTeam: (teamId, payload) => apiRequest(`/teams/${id(teamId)}`, { method: 'PUT', body: payload }),

  deleteTeam: (teamId) => apiRequest(`/teams/${id(teamId)}`, { method: 'DELETE' }),

  listColumns: (workspaceId) => apiRequest(`/workspaces/${id(workspaceId)}/columns`),

  createColumns: (workspaceId, entries) =>
    apiRequest(`/workspaces/${id(workspaceId)}/columns`, { method: 'POST', body: { entries } }),

  updateColumn: (columnId, payload) => apiRequest(`/columns/${id(columnId)}`, { method: 'PUT', body: payload }),

  deleteColumn: (columnId) => apiRequest(`/columns/${id(columnId)}`, { method: 'DELETE' }),

  addMember: (workspaceId, payload) =>
    apiRequest(`/workspaces/${id(workspaceId)}/members`, { method: 'POST', body: payload }),

  removeMember: (workspaceId, employeeId) =>
    apiRequest(`/workspaces/${id(workspaceId)}/members/${id(employeeId)}`, { method: 'DELETE' }),
}
