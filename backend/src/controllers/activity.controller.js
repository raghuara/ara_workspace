const activityModel = require("../models/activity.model");
const workspaceModel = require("../models/workspace.model");
const { HISTORY_ACTIONS } = require("../constants/admin");
const { USER_TYPE } = require("../constants/workspace");

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;

const text = (value) => (typeof value === "string" ? value.trim() : "");
const parseJson = (value, fallback) => {
  if (value && typeof value === "object") return value;
  if (typeof value !== "string") return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const visibleWorkspaceIds = async (req) =>
  req.user.userTypeId === USER_TYPE.MASTER_ADMIN ? null : workspaceModel.findWorkspaceIdsForEmployee(req.user.employeeId);

const mapEntry = (row) => ({
  id: row.id,
  taskId: row.task_id,
  workspaceId: row.workspace_id,
  actorId: row.actor_id,
  actorName: row.actor_id ? (row.actor_name ?? "Unknown") : "Automation",
  isAutomation: !row.actor_id,
  action: row.action,
  summary: row.summary,
  detail: parseJson(row.detail, null),
  at: row.at,
  taskTitle: row.task_title ?? "Deleted task",
  clientName: row.client_name ?? "—",
  clientTone: row.client_tone ?? "slate"
});

const listActivity = async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(req.query.pageSize, 10) || DEFAULT_PAGE_SIZE));
  const action = text(req.query.action);

  const { rows, total } = await activityModel.findActivity({
    filters: {
      workspaceIds: await visibleWorkspaceIds(req),
      workspaceId: text(req.query.workspaceId),
      search: text(req.query.search),
      action: HISTORY_ACTIONS.includes(action) ? action : "",
      actorId: text(req.query.actorId)
    },
    page,
    pageSize
  });

  res.json({ items: rows.map(mapEntry), total, page, pageSize });
};

const listActors = async (req, res) => {
  const rows = await activityModel.findActors({
    workspaceIds: await visibleWorkspaceIds(req),
    workspaceId: text(req.query.workspaceId)
  });
  res.json(rows.map((row) => ({ id: row.id, fullName: row.full_name })));
};

module.exports = {
  listActivity,
  listActors
};
