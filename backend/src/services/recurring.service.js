const recurringModel = require("../models/recurring.model");
const taskModel = require("../models/task.model");
const workspaceModel = require("../models/workspace.model");
const { nextId } = require("../utils/ids");
const { withTransaction } = require("../utils/transaction");
const { matchesDate, addDays, todayIso } = require("../utils/recurrence");
const notifications = require("./notification.service");

const parseJson = (value, fallback) => {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const scheduleOf = (rule) => ({
  frequency: rule.frequency,
  weekdays: parseJson(rule.weekdays, []),
  monthDays: parseJson(rule.month_days, [])
});

const spawnTasks = async (rule, assignees, columnId, connection) => {
  const today = todayIso();
  const dueDate = addDays(today, rule.due_offset_days);
  const batches = rule.per_assignee && assignees.length > 0 ? assignees.map((assignee) => [assignee.id]) : [assignees.map((a) => a.id)];

  let created = 0;
  for (const assigneeIds of batches) {
    const id = await nextId("TSK", connection);
    await taskModel.insertTask(
      {
        id,
        workspaceId: rule.workspace_id,
        groupId: rule.group_id,
        teamId: rule.team_id,
        clientId: rule.client_id,
        statusId: columnId,
        title: rule.title,
        description: rule.description,
        priority: rule.priority,
        sizeKey: rule.size_key,
        points: rule.points,
        tags: [],
        createdById: rule.created_by_id,
        dueDate,
        scheduledDate: null
      },
      connection
    );
    await taskModel.replaceAssignees(id, assigneeIds, connection);

    const base = { taskId: id, workspaceId: rule.workspace_id, actorId: null };
    await taskModel.insertHistory(
      { ...base, action: "created", summary: "created automatically from a recurring task", detail: { rule: rule.id, title: rule.title } },
      connection
    );
    if (assigneeIds.length > 0) {
      await taskModel.insertHistory({ ...base, action: "assigned", summary: "assigned this task", detail: { to: assigneeIds } }, connection);
      await notifications.taskAssigned(
        { task: { id, workspaceId: rule.workspace_id, title: rule.title }, assigneeIds, actorId: null, viaRecurring: true },
        connection
      );
    }
    created += 1;
  }
  return created;
};

const runRecurringTasks = async (workspaceId) => {
  const due = await recurringModel.findDueRules(workspaceId);
  if (due.length === 0) return 0;

  const columns = await workspaceModel.findColumns(workspaceId);
  const target = columns.find((column) => column.kind === "todo") ?? columns[0];
  if (!target) return 0;

  const assigneesByRule = await recurringModel.findAssigneesByRuleIds(due.map((rule) => rule.id));
  const today = new Date();
  let total = 0;

  for (const rule of due) {
    const fires = matchesDate(scheduleOf(rule), today);
    await withTransaction(async (connection) => {
      const created = fires ? await spawnTasks(rule, assigneesByRule.get(rule.id) ?? [], target.id, connection) : 0;
      await recurringModel.markRun(rule.id, created, connection);
      total += created;
    });
  }

  return total;
};

module.exports = {
  runRecurringTasks,
  scheduleOf
};
