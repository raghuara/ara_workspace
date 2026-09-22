const STATUS_KINDS = ["backlog", "scheduled", "todo", "processing", "review", "correction", "completed", "custom"];

const DEFAULT_STATUS_TEMPLATES = [
  { key: "todo", name: "To Do", kind: "todo", tone: "slate", preset: true },
  { key: "processing", name: "Processing", kind: "processing", tone: "blue", preset: true },
  { key: "review", name: "Review", kind: "review", tone: "amber", preset: true },
  { key: "correction", name: "Correction", kind: "correction", tone: "rose", preset: true },
  { key: "completed", name: "Completed", kind: "completed", tone: "green", preset: true },
  { key: "scheduled", name: "Scheduled", kind: "scheduled", tone: "violet", preset: false },
  { key: "backlog", name: "Backlog", kind: "backlog", tone: "gray", preset: false }
];

const TONES = ["slate", "blue", "amber", "rose", "green", "violet", "teal", "gray", "orange", "pink"];

const PRIORITIES = ["Urgent", "High", "Normal", "Low"];

const TASK_SIZES = {
  XS: 1,
  S: 2,
  M: 5,
  L: 8,
  XL: 13
};

const CLIENT_STATUSES = ["Active", "On hold", "Prospect", "Inactive"];

const USER_TYPE = {
  MASTER_ADMIN: 1,
  ADMIN: 2,
  EMPLOYEE: 3,
  TEAM_LEAD: 4
};

const LIMITS = {
  WORKSPACES: 10,
  GROUPS_PER_WORKSPACE: 15
};

module.exports = {
  STATUS_KINDS,
  DEFAULT_STATUS_TEMPLATES,
  TONES,
  PRIORITIES,
  TASK_SIZES,
  CLIENT_STATUSES,
  USER_TYPE,
  LIMITS
};
