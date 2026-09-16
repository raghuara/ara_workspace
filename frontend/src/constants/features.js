/**
 * Feature access registry. Turning a feature off hides its navigation, blocks
 * its routes and disables the related UI everywhere — this is how Recruitment
 * and Compensation are currently hidden rather than deleted, so they can be
 * switched back on without restoring any code.
 *
 * `locked: true` marks features the product cannot run without.
 */
export const FEATURES = {
  WORKSPACES: 'workspaces',
  BOARD_VIEW: 'view.board',
  LIST_VIEW: 'view.list',
  TABLE_VIEW: 'view.table',
  WEIGHTAGE: 'task.weightage',
  AUTOMATIONS: 'task.automations',
  RECURRING_TASKS: 'task.recurring',
  CLIENTS: 'clients',
  EMPLOYEES: 'employees',
  ACTIVITY_LOG: 'activity',
  REPORTS: 'reports',
  RECRUITMENT: 'recruitment',
  PERFORMANCE: 'performance',
  COMPENSATION: 'compensation',
}

export const FEATURE_CATALOG = [
  {
    key: 'core',
    label: 'Work tracking',
    features: [
      {
        key: FEATURES.WORKSPACES,
        name: 'Workspaces',
        description: 'Boards, groups, teams and tasks. The core of the product.',
        defaultEnabled: true,
        locked: true,
      },
      {
        key: FEATURES.BOARD_VIEW,
        name: 'Board view',
        description: 'Kanban columns with drag-and-drop between statuses.',
        defaultEnabled: true,
      },
      {
        key: FEATURES.LIST_VIEW,
        name: 'List view',
        description: 'Grouped list with inline status changes.',
        defaultEnabled: true,
      },
      {
        key: FEATURES.TABLE_VIEW,
        name: 'Table view',
        description: 'Dense spreadsheet-style grid with sorting.',
        defaultEnabled: true,
      },
      {
        key: FEATURES.WEIGHTAGE,
        name: 'Task weightage',
        description: 'Size tasks in points so volume and complexity are compared fairly.',
        defaultEnabled: true,
      },
      {
        key: FEATURES.AUTOMATIONS,
        name: 'Automations',
        description: 'Rules such as moving scheduled tasks into To Do on their day.',
        defaultEnabled: true,
      },
      {
        key: FEATURES.RECURRING_TASKS,
        name: 'Recurring tasks',
        description: 'Tasks that create themselves on a schedule — every day, chosen weekdays, or set dates each month.',
        defaultEnabled: true,
      },
    ],
  },
  {
    key: 'directory',
    label: 'Directories',
    features: [
      {
        key: FEATURES.CLIENTS,
        name: 'Clients',
        description: 'Client directory used for filing and filtering tasks.',
        defaultEnabled: true,
      },
      {
        key: FEATURES.EMPLOYEES,
        name: 'Employees',
        description: 'Employee directory and profiles.',
        defaultEnabled: true,
      },
    ],
  },
  {
    key: 'insight',
    label: 'Insight',
    features: [
      {
        key: FEATURES.REPORTS,
        name: 'Workload reports',
        description: 'Per-person comparison of tasks completed against points earned.',
        defaultEnabled: true,
      },
      {
        key: FEATURES.ACTIVITY_LOG,
        name: 'Activity log',
        description: 'Organisation-wide audit trail of every change.',
        defaultEnabled: true,
      },
    ],
  },
  {
    key: 'hr',
    label: 'HR modules',
    features: [
      {
        key: FEATURES.PERFORMANCE,
        name: 'Performance',
        description: 'Employee review cycles, ratings and goals.',
        defaultEnabled: true,
      },
      {
        key: FEATURES.RECRUITMENT,
        name: 'Recruitment',
        description: 'Interview schedule and interview scorecards.',
        defaultEnabled: false,
      },
      {
        key: FEATURES.COMPENSATION,
        name: 'Compensation',
        description: 'Salary overview, increments and salary history. Restricted module.',
        defaultEnabled: false,
      },
    ],
  },
]

export const ALL_FEATURES = FEATURE_CATALOG.flatMap((group) => group.features)

export const DEFAULT_FEATURE_STATE = Object.fromEntries(
  ALL_FEATURES.map((feature) => [feature.key, feature.defaultEnabled]),
)
