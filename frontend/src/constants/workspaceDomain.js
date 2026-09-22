export const STATUS_KINDS = {
  BACKLOG: 'backlog',
  SCHEDULED: 'scheduled',
  TODO: 'todo',
  PROCESSING: 'processing',
  REVIEW: 'review',
  CORRECTION: 'correction',
  COMPLETED: 'completed',
  CUSTOM: 'custom',
}

/**
 * The five defaults offered by "Add group", plus Scheduled. `kind` drives
 * behaviour (automations, completion accounting); `name` is free text the user
 * can rename without breaking either.
 */
export const DEFAULT_STATUS_TEMPLATES = [
  { key: 'todo', name: 'To Do', kind: STATUS_KINDS.TODO, tone: 'slate', preset: true },
  { key: 'processing', name: 'Processing', kind: STATUS_KINDS.PROCESSING, tone: 'blue', preset: true },
  { key: 'review', name: 'Review', kind: STATUS_KINDS.REVIEW, tone: 'amber', preset: true },
  { key: 'correction', name: 'Correction', kind: STATUS_KINDS.CORRECTION, tone: 'rose', preset: true },
  { key: 'completed', name: 'Completed', kind: STATUS_KINDS.COMPLETED, tone: 'green', preset: true },
  { key: 'scheduled', name: 'Scheduled', kind: STATUS_KINDS.SCHEDULED, tone: 'violet', preset: false },
  { key: 'backlog', name: 'Backlog', kind: STATUS_KINDS.BACKLOG, tone: 'gray', preset: false },
]

export const STATUS_TONES = {
  slate: { soft: '#F1F5F9', tint: '#EAEFF5', strong: '#475569', border: '#E2E8F0' },
  blue: { soft: '#EFF6FF', tint: '#E5F0FE', strong: '#1D4ED8', border: '#DBEAFE' },
  amber: { soft: '#FFFBEB', tint: '#FEF7D9', strong: '#B45309', border: '#FDE68A' },
  rose: { soft: '#FFF1F2', tint: '#FFEAEC', strong: '#BE123C', border: '#FECDD3' },
  green: { soft: '#F0FDF4', tint: '#E6FCED', strong: '#15803D', border: '#BBF7D0' },
  violet: { soft: '#F5F3FF', tint: '#EFEBFE', strong: '#6D28D9', border: '#DDD6FE' },
  teal: { soft: '#F0FDFA', tint: '#E0FBF5', strong: '#0F766E', border: '#99F6E4' },
  gray: { soft: '#F8FAFC', tint: '#EEF2F6', strong: '#64748B', border: '#E2E8F0' },
  orange: { soft: '#FFF7ED', tint: '#FFF2E1', strong: '#C2410C', border: '#FED7AA' },
  pink: { soft: '#FDF2F8', tint: '#FCECF5', strong: '#BE185D', border: '#FBCFE8' },
}

export const TONE_KEYS = Object.keys(STATUS_TONES)

export const PRIORITIES = {
  URGENT: 'Urgent',
  HIGH: 'High',
  NORMAL: 'Normal',
  LOW: 'Low',
}

export const PRIORITY_TONES = {
  [PRIORITIES.URGENT]: 'rose',
  [PRIORITIES.HIGH]: 'amber',
  [PRIORITIES.NORMAL]: 'blue',
  [PRIORITIES.LOW]: 'gray',
}

/**
 * Effort sizing. Points are what make five small tasks comparable against one
 * large task — completion is reported in both task count and points earned, so
 * neither a high-volume nor a high-complexity workload looks artificially better.
 */
export const TASK_SIZES = [
  { key: 'XS', label: 'Extra small', points: 1, guide: 'Under an hour — a tweak or quick fix' },
  { key: 'S', label: 'Small', points: 2, guide: 'A couple of hours' },
  { key: 'M', label: 'Medium', points: 5, guide: 'Half a day' },
  { key: 'L', label: 'Large', points: 8, guide: 'A full day' },
  { key: 'XL', label: 'Extra large', points: 13, guide: 'Multiple days — consider splitting' },
]

export const sizeByKey = (key) => TASK_SIZES.find((size) => size.key === key) ?? TASK_SIZES[2]

export const SCHEDULE_MODES = {
  TODAY: 'today',
  SCHEDULED: 'scheduled',
  BACKDATED: 'backdated',
}

export const TASK_TABS = [
  { value: 'today', label: 'Today' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'all', label: 'All tasks' },
]

export const VIEW_MODES = [
  { value: 'board', label: 'Board' },
  { value: 'list', label: 'List' },
  { value: 'table', label: 'Table' },
]

export const LIMITS = {
  WORKSPACES: 10,
  GROUPS_PER_WORKSPACE: 15,
}

export const RECURRENCE = {
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
}

export const WEEKDAYS = [
  { value: 1, label: 'Monday', short: 'Mon', letter: 'M' },
  { value: 2, label: 'Tuesday', short: 'Tue', letter: 'T' },
  { value: 3, label: 'Wednesday', short: 'Wed', letter: 'W' },
  { value: 4, label: 'Thursday', short: 'Thu', letter: 'T' },
  { value: 5, label: 'Friday', short: 'Fri', letter: 'F' },
  { value: 6, label: 'Saturday', short: 'Sat', letter: 'S' },
  { value: 0, label: 'Sunday', short: 'Sun', letter: 'S' },
]

export const WEEKDAY_PRESETS = [
  { key: 'daily', label: 'Every day', days: [1, 2, 3, 4, 5, 6, 0] },
  { key: 'weekdays', label: 'Weekdays', days: [1, 2, 3, 4, 5] },
  { key: 'weekends', label: 'Weekends', days: [6, 0] },
]

export const DUE_OFFSETS = [
  { value: 0, label: 'Same day' },
  { value: 1, label: 'Next day' },
  { value: 2, label: 'In 2 days' },
  { value: 3, label: 'In 3 days' },
  { value: 5, label: 'In 5 days' },
  { value: 7, label: 'In a week' },
  { value: 14, label: 'In two weeks' },
]

export const AUTOMATION_RULES = [
  {
    id: 'recurring-tasks',
    name: 'Create recurring tasks each day',
    description:
      'Every day, each active recurring task that falls on that day is created in To Do for its assignees.',
    defaultEnabled: true,
  },
  {
    id: 'scheduled-to-todo',
    name: 'Move scheduled tasks into To Do on their day',
    description:
      'When a task in a Scheduled group reaches its scheduled date, it moves automatically into the first To Do group.',
    defaultEnabled: true,
  },
  {
    id: 'overdue-flag',
    name: 'Flag overdue tasks',
    description: 'Tasks past their due date and not completed are marked overdue on every view.',
    defaultEnabled: true,
  },
  {
    id: 'correction-reopen',
    name: 'Reopen on correction',
    description: 'Moving a completed task into Correction clears its completion date so it counts as open again.',
    defaultEnabled: true,
  },
  {
    id: 'complete-stamps-date',
    name: 'Stamp completion date',
    description: 'Moving a task into a Completed group records who completed it and when.',
    defaultEnabled: true,
  },
]

export const HISTORY_ACTIONS = {
  CREATED: 'created',
  MOVED: 'moved',
  UPDATED: 'updated',
  ASSIGNED: 'assigned',
  COMMENTED: 'commented',
  COMPLETED: 'completed',
  DELETED: 'deleted',
}
