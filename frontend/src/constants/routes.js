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
  clientDesk: '/client-desk',
  employees: '/employees',
  employeeImport: '/employees/import',
  employeeDetail: '/employees/:employeeId',
  activity: '/activity',
  performance: '/performance',

  adminSetup: '/admin/setup',
  adminWorkspaces: '/admin/setup/workspaces',
  adminDepartments: '/admin/setup/departments',
  adminDesignations: '/admin/setup/designations',
  adminAccess: '/admin/access',
  adminUserTypes: '/admin/access/user-types',
  adminAccounts: '/admin/access/accounts',
  adminFeatures: '/admin/access/features',

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

/** Appends task filters so a dashboard card can land on an already-filtered view. */
export const withFilters = (path, filters = {}) => {
  const query = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    if (value) query.set(key, value)
  })
  const text = query.toString()
  return text ? `${path}?${text}` : path
}

export const filteredViewPath = (scope = {}, view = DEFAULT_VIEW, filters = {}) =>
  withFilters(viewPathFor(scope, view), filters)
