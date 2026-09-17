const FEATURES = [
  { key: "workspaces", name: "Workspaces", locked: true },
  { key: "view.board", name: "Board view" },
  { key: "view.list", name: "List view" },
  { key: "view.table", name: "Table view" },
  { key: "task.weightage", name: "Task weightage" },
  { key: "task.automations", name: "Automations" },
  { key: "clients", name: "Clients" },
  { key: "employees", name: "Employees" },
  { key: "reports", name: "Workload reports" },
  { key: "activity", name: "Activity log" },
  { key: "performance", name: "Performance" }
];

const AUTOMATION_RULES = [
  {
    id: "scheduled-to-todo",
    name: "Move scheduled tasks into To Do on their day",
    description:
      "When a task in a Scheduled group reaches its scheduled date, it moves automatically into the first To Do group.",
    defaultEnabled: true
  },
  {
    id: "overdue-flag",
    name: "Flag overdue tasks",
    description: "Tasks past their due date and not completed are marked overdue on every view.",
    defaultEnabled: true
  },
  {
    id: "correction-reopen",
    name: "Reopen on correction",
    description: "Moving a completed task into Correction clears its completion date so it counts as open again.",
    defaultEnabled: true
  },
  {
    id: "complete-stamps-date",
    name: "Stamp completion date",
    description: "Moving a task into a Completed group records who completed it and when.",
    defaultEnabled: true
  }
];

const HISTORY_ACTIONS = ["created", "moved", "updated", "assigned", "commented", "completed", "deleted"];

module.exports = {
  FEATURES,
  AUTOMATION_RULES,
  HISTORY_ACTIONS
};
