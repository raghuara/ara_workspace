export const PERMISSIONS = {
  // Workspace structure
  WORKSPACE_VIEW: 'workspace.view',
  WORKSPACE_CREATE: 'workspace.create',
  WORKSPACE_UPDATE: 'workspace.update',
  WORKSPACE_DELETE: 'workspace.delete',
  GROUP_MANAGE: 'group.manage',
  TEAM_MANAGE: 'team.manage',
  STATUS_MANAGE: 'status.manage',
  AUTOMATION_MANAGE: 'automation.manage',

  // Tasks
  TASK_VIEW: 'task.view',
  TASK_VIEW_ALL: 'task.view.all',
  TASK_CREATE: 'task.create',
  TASK_UPDATE: 'task.update',
  TASK_DELETE: 'task.delete',
  TASK_ASSIGN: 'task.assign',
  TASK_MOVE: 'task.move',
  TASK_WEIGHTAGE_SET: 'task.weightage.set',
  TASK_RECURRING: 'task.recurring',

  // Clients
  CLIENT_VIEW: 'client.view',
  CLIENT_CREATE: 'client.create',
  CLIENT_UPDATE: 'client.update',
  CLIENT_DELETE: 'client.delete',

  // People
  EMPLOYEE_VIEW: 'employee.view',
  EMPLOYEE_UPDATE: 'employee.update',

  // Insight
  DASHBOARD_VIEW: 'dashboard.view',

  // Administration
  USERTYPE_VIEW: 'usertype.view',
  USERTYPE_MANAGE: 'usertype.manage',
  FEATURE_MANAGE: 'feature.manage',
  ACTIVITY_VIEW: 'activity.view',
  REPORT_VIEW: 'report.view',

}

/**
 * Grouped for the user-type editor so permissions are presented as readable
 * capabilities rather than a flat list of keys.
 */
export const PERMISSION_CATALOG = [
  {
    key: 'workspace',
    label: 'Workspaces',
    description: 'Creating workspaces and shaping their groups, teams and columns',
    permissions: [
      { key: PERMISSIONS.WORKSPACE_VIEW, label: 'View workspaces' },
      { key: PERMISSIONS.WORKSPACE_CREATE, label: 'Create workspaces' },
      { key: PERMISSIONS.WORKSPACE_UPDATE, label: 'Edit workspace settings' },
      { key: PERMISSIONS.WORKSPACE_DELETE, label: 'Delete workspaces' },
      { key: PERMISSIONS.GROUP_MANAGE, label: 'Manage groups' },
      { key: PERMISSIONS.TEAM_MANAGE, label: 'Manage teams' },
      { key: PERMISSIONS.STATUS_MANAGE, label: 'Manage board columns' },
      { key: PERMISSIONS.AUTOMATION_MANAGE, label: 'Manage automations' },
    ],
  },
  {
    key: 'task',
    label: 'Tasks',
    description: 'Day-to-day work items',
    permissions: [
      { key: PERMISSIONS.TASK_VIEW, label: 'View own and team tasks' },
      { key: PERMISSIONS.TASK_VIEW_ALL, label: 'View every task in the workspace' },
      { key: PERMISSIONS.TASK_CREATE, label: 'Create tasks' },
      { key: PERMISSIONS.TASK_UPDATE, label: 'Edit tasks' },
      { key: PERMISSIONS.TASK_DELETE, label: 'Delete tasks' },
      { key: PERMISSIONS.TASK_ASSIGN, label: 'Assign tasks to people' },
      { key: PERMISSIONS.TASK_MOVE, label: 'Move tasks between columns' },
      { key: PERMISSIONS.TASK_WEIGHTAGE_SET, label: 'Set task size and weightage' },
      { key: PERMISSIONS.TASK_RECURRING, label: 'Manage recurring tasks' },
    ],
  },
  {
    key: 'client',
    label: 'Clients',
    description: 'The client directory tasks are filed against',
    permissions: [
      { key: PERMISSIONS.CLIENT_VIEW, label: 'View clients' },
      { key: PERMISSIONS.CLIENT_CREATE, label: 'Add clients' },
      { key: PERMISSIONS.CLIENT_UPDATE, label: 'Edit clients' },
      { key: PERMISSIONS.CLIENT_DELETE, label: 'Delete clients' },
    ],
  },
  {
    key: 'people',
    label: 'People',
    description: 'The employee directory',
    permissions: [
      { key: PERMISSIONS.EMPLOYEE_VIEW, label: 'View employees' },
      { key: PERMISSIONS.EMPLOYEE_UPDATE, label: 'Edit employee records' },
    ],
  },
  {
    key: 'insight',
    label: 'Insight',
    description: 'Dashboards, reports and the activity log',
    permissions: [
      { key: PERMISSIONS.DASHBOARD_VIEW, label: 'View the dashboard' },
      { key: PERMISSIONS.REPORT_VIEW, label: 'View workload and reports' },
      { key: PERMISSIONS.ACTIVITY_VIEW, label: 'View the activity log' },
    ],
  },
  {
    key: 'admin',
    label: 'Administration',
    description: 'Roles, logins and feature access',
    permissions: [
      { key: PERMISSIONS.USERTYPE_VIEW, label: 'View user types' },
      { key: PERMISSIONS.USERTYPE_MANAGE, label: 'Create and edit user types, manage logins' },
      { key: PERMISSIONS.FEATURE_MANAGE, label: 'Turn features on and off' },
    ],
  },
]

export const ALL_PERMISSION_KEYS = PERMISSION_CATALOG.flatMap((group) =>
  group.permissions.map((permission) => permission.key),
)
