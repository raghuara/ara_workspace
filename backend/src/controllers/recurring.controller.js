const recurringModel = require("../models/recurring.model");
const taskModel = require("../models/task.model");
const workspaceModel = require("../models/workspace.model");
const { runRecurringTasks, scheduleOf } = require("../services/recurring.service");
const { nextId } = require("../utils/ids");
const { withTransaction } = require("../utils/transaction");
const { normaliseSchedule, isScheduleComplete, nextOccurrences, todayIso } = require("../utils/recurrence");
const { PRIORITIES, TASK_SIZES, USER_TYPE } = require("../constants/workspace");

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const text = (value) => (typeof value === "string" ? value.trim() : "");
const idList = (value) => (Array.isArray(value) ? [...new Set(value.map(text).filter(Boolean))] : []);
const isValidDate = (value) => DATE_PATTERN.test(value) && !Number.isNaN(Date.parse(value));

const badRequest = (res, message, errors) =>
  res.status(400).json({ message, code: errors ? "VALIDATION_ERROR" : "BAD_REQUEST", ...(errors && { errors }) });
const notFound = (res, message = "That recurring task does not exist.") => res.status(404).json({ message, code: "NOT_FOUND" });
const forbidden = (res) => res.status(403).json({ message: "You do not have access to this workspace.", code: "FORBIDDEN" });

const nextRunFor = (rule) => {
  if (!rule.is_active) return null;
  const today = todayIso();
  const from = rule.start_date > today ? rule.start_date : today;
  const candidates = nextOccurrences(scheduleOf(rule), { from, endDate: rule.end_date, count: 2 });
  return candidates.find((day) => day !== rule.last_run_on) ?? null;
};

const mapRule = (row, assignees = []) => ({
  id: row.id,
  workspaceId: row.workspace_id,
  groupId: row.group_id,
  teamId: row.team_id,
  clientId: row.client_id,
  title: row.title,
  description: row.description ?? "",
  priority: row.priority,
  sizeKey: row.size_key,
  points: row.points,
  assigneeIds: assignees.map((assignee) => assignee.id),
  assignees,
  perAssignee: Boolean(row.per_assignee),
  schedule: scheduleOf(row),
  dueOffsetDays: row.due_offset_days,
  startDate: row.start_date,
  endDate: row.end_date,
  isActive: Boolean(row.is_active),
  lastRunOn: row.last_run_on,
  nextRunOn: nextRunFor(row),
  createdCount: row.created_count,
  createdById: row.created_by_id,
  createdByName: row.created_by_name ?? "—",
  createdAt: row.created_at,
  clientName: row.client_name ?? null,
  clientTone: row.client_tone ?? "slate",
  groupName: row.group_name ?? null,
  groupTone: row.group_tone ?? "slate",
  teamName: row.team_name ?? "—"
});

const withAssignees = async (rows) => {
  const assignees = await recurringModel.findAssigneesByRuleIds(rows.map((row) => row.id));
  return rows.map((row) => mapRule(row, assignees.get(row.id) ?? []));
};

const loadOne = async (ruleId) => {
  const row = await recurringModel.findRuleById(ruleId);
  if (!row) return null;
  const [rule] = await withAssignees([row]);
  return rule;
};

const ensureAccess = async (req, res, workspaceId) => {
  if (!(await workspaceModel.findWorkspaceById(workspaceId))) {
    notFound(res, "That workspace does not exist.");
    return false;
  }
  if (req.user.userTypeId !== USER_TYPE.MASTER_ADMIN && !(await workspaceModel.isMember(workspaceId, req.user.employeeId))) {
    forbidden(res);
    return false;
  }
  return true;
};

const validateRule = async (body, workspaceId) => {
  const errors = {};

  const data = {
    title: text(body.title).slice(0, 200),
    description: text(body.description) || null,
    groupId: text(body.groupId) || null,
    teamId: text(body.teamId) || null,
    clientId: text(body.clientId) || null,
    priority: text(body.priority) || "Normal",
    sizeKey: text(body.sizeKey) || "M",
    perAssignee: Boolean(body.perAssignee),
    schedule: normaliseSchedule(body.schedule),
    dueOffsetDays: Number.isInteger(body.dueOffsetDays) ? body.dueOffsetDays : 0,
    startDate: text(body.startDate),
    endDate: text(body.endDate) || null,
    assigneeIds: idList(body.assigneeIds)
  };

  if (!data.title) errors.title = "A task title is required.";
  if (!PRIORITIES.includes(data.priority)) errors.priority = "Unknown priority.";
  if (!TASK_SIZES[data.sizeKey]) errors.sizeKey = "Unknown size.";
  data.points = TASK_SIZES[data.sizeKey] ?? 5;

  if (!isScheduleComplete(data.schedule)) {
    errors.schedule = data.schedule.frequency === "monthly" ? "Pick at least one date of the month." : "Pick at least one day of the week.";
  }
  if (data.dueOffsetDays < 0 || data.dueOffsetDays > 365) errors.dueOffsetDays = "Due offset must be between 0 and 365 days.";

  if (!data.startDate) errors.startDate = "Pick a start date.";
  else if (!isValidDate(data.startDate)) errors.startDate = "Use the format YYYY-MM-DD.";

  if (data.endDate && !isValidDate(data.endDate)) errors.endDate = "Use the format YYYY-MM-DD.";
  else if (data.endDate && data.startDate && data.endDate < data.startDate) errors.endDate = "The end date must be after the start.";

  if (data.groupId && !(await taskModel.existsInWorkspace("workspace_groups", data.groupId, workspaceId))) errors.groupId = "That group does not exist.";
  if (data.teamId && !(await taskModel.teamBelongsToWorkspace(data.teamId, workspaceId))) errors.teamId = "That team does not exist.";
  if (data.clientId && !(await taskModel.existsInWorkspace("clients", data.clientId, workspaceId))) errors.clientId = "That client does not exist.";
  if (!(await workspaceModel.employeesExist(data.assigneeIds))) errors.assigneeIds = "Unknown employee.";

  return { errors, data };
};

const listRules = async (req, res) => {
  const { workspaceId } = req.params;
  if (!(await ensureAccess(req, res, workspaceId))) return;

  await runRecurringTasks(workspaceId);
  res.json(await withAssignees(await recurringModel.findRulesByWorkspace(workspaceId)));
};

const getRule = async (req, res) => {
  const rule = await loadOne(req.params.ruleId);
  if (!rule) return notFound(res);
  if (!(await ensureAccess(req, res, rule.workspaceId))) return;

  res.json(rule);
};

const createRule = async (req, res) => {
  const { workspaceId } = req.params;
  if (!(await ensureAccess(req, res, workspaceId))) return;

  const { errors, data } = await validateRule(req.body, workspaceId);
  if (Object.keys(errors).length > 0) return badRequest(res, "Please fix the highlighted fields.", errors);

  const ruleId = await withTransaction(async (connection) => {
    const id = await nextId("RCR", connection);
    await recurringModel.insertRule({ ...data, id, workspaceId, createdById: req.user.employeeId }, connection);
    await recurringModel.replaceAssignees(id, data.assigneeIds, connection);
    return id;
  });

  await runRecurringTasks(workspaceId);
  res.status(201).json(await loadOne(ruleId));
};

const updateRule = async (req, res) => {
  const existing = await loadOne(req.params.ruleId);
  if (!existing) return notFound(res);
  if (!(await ensureAccess(req, res, existing.workspaceId))) return;

  const { errors, data } = await validateRule({ ...existing, ...req.body }, existing.workspaceId);
  if (Object.keys(errors).length > 0) return badRequest(res, "Please fix the highlighted fields.", errors);

  await withTransaction(async (connection) => {
    await recurringModel.updateRule(existing.id, data, connection);
    await recurringModel.replaceAssignees(existing.id, data.assigneeIds, connection);
  });

  res.json(await loadOne(existing.id));
};

const setStatus = async (req, res) => {
  const existing = await loadOne(req.params.ruleId);
  if (!existing) return notFound(res);
  if (!(await ensureAccess(req, res, existing.workspaceId))) return;

  await recurringModel.setActive(existing.id, Boolean(req.body.isActive));
  if (req.body.isActive) await runRecurringTasks(existing.workspaceId);
  res.json(await loadOne(existing.id));
};

const deleteRule = async (req, res) => {
  const existing = await loadOne(req.params.ruleId);
  if (!existing) return notFound(res);
  if (!(await ensureAccess(req, res, existing.workspaceId))) return;

  await recurringModel.deleteRule(existing.id);
  res.json({ id: existing.id });
};

module.exports = {
  listRules,
  getRule,
  createRule,
  updateRule,
  setStatus,
  deleteRule
};
