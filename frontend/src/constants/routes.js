export const ROUTES = {
  login: '/login',
  dashboard: '/',

  workspace: '/workspace',
  reports: '/workspace/reports',
  recurring: '/workspace/recurring',
  // The view (board | list | table) is the last segment, so a group or team
  // keeps its context when you switch between views.
  workspaceView: '/workspace/:view',
  groupView: '/workspace/groups/:groupId/:view',
  teamView: '/workspace/groups/:groupId/teams/:teamId/:view',

  clients: '/clients',
  employees: '/employees',
  employeeDetail: '/employees/:employeeId',
  activity: '/activity',

  adminWorkspaces: '/admin/workspaces',
  adminUserTypes: '/admin/user-types',
  adminFeatures: '/admin/features',
  adminDepartments: '/admin/departments',
  adminDesignations: '/admin/designations',
  adminAccounts: '/admin/accounts',

}

export const DEFAULT_VIEW = 'board'

export const employeeDetailPath = (employeeId) => `/employees/${employeeId}`

export const workspaceViewPath = (view = DEFAULT_VIEW) => `/workspace/${view}`

export const groupViewPath = (groupId, view = DEFAULT_VIEW) => `/workspace/groups/${groupId}/${view}`

export const teamViewPath = (groupId, teamId, view = DEFAULT_VIEW) =>
  `/workspace/groups/${groupId}/teams/${teamId}/${view}`

/** Rebuilds the current location for a different view, keeping group/team scope. */
export const viewPathFor = ({ groupId, teamId }, view) => {
  if (groupId && teamId) return teamViewPath(groupId, teamId, view)
  if (groupId) return groupViewPath(groupId, view)
  return workspaceViewPath(view)
}
