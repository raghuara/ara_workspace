const clientModel = require("../models/client.model");
const ticketModel = require("../models/ticket.model");
const access = require("../services/access.service");
const workspaceModel = require("../models/workspace.model");
const { broadcastFrom: broadcast } = require("../utils/realtime");
const { nextId } = require("../utils/ids");
const { CLIENT_STATUSES, TONES, USER_TYPE } = require("../constants/workspace");

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const text = (value) => (typeof value === "string" ? value.trim() : "");
const idList = (value) => (Array.isArray(value) ? [...new Set(value.map(text).filter(Boolean))] : []);
const tone = (value, fallback) => (TONES.includes(value) ? value : fallback);

const mapClient = (row, assignees = []) => ({
  assignees,
  assigneeIds: assignees.map((person) => person.id),
  id: row.id,
  workspaceId: row.workspace_id,
  name: row.name,
  company: row.company ?? "",
  tone: row.tone,
  contactName: row.contact_name ?? "",
  email: row.email ?? "",
  phone: row.phone ?? "",
  status: row.status,
  taskCount: row.task_count,
  openTaskCount: row.open_task_count,
  points: Number(row.points)
});

const canAccessWorkspace = async (req, workspaceId) =>
  req.user.userTypeId === USER_TYPE.MASTER_ADMIN || workspaceModel.isMember(workspaceId, req.user.employeeId);

const allowedWorkspaceIds = async (req) =>
  req.user.userTypeId === USER_TYPE.MASTER_ADMIN ? null : workspaceModel.findWorkspaceIdsForEmployee(req.user.employeeId);

const validationFailed = (res, message, errors) =>
  res.status(400).json({ message, code: "VALIDATION_ERROR", errors });

const notFound = (res) => res.status(404).json({ message: "That client does not exist.", code: "NOT_FOUND" });

const validateClient = (body, existing = null) => {
  const errors = {};

  const pick = (field, fallback) => (body[field] === undefined ? fallback : text(body[field]));

  const data = {
    name: pick("name", existing?.name ?? ""),
    company: pick("company", existing?.company ?? "") || null,
    tone: tone(body.tone, existing?.tone ?? "blue"),
    contactName: pick("contactName", existing?.contact_name ?? "") || null,
    email: pick("email", existing?.email ?? "").toLowerCase() || null,
    phone: pick("phone", existing?.phone ?? "") || null,
    status: pick("status", existing?.status ?? "Active") || "Active"
  };

  if (!data.name) errors.name = "Client name is required.";
  if (data.email && !EMAIL_PATTERN.test(data.email)) errors.email = "Enter a valid email address.";
  if (!CLIENT_STATUSES.includes(data.status)) errors.status = "Unknown status.";

  return { errors, data };
};

const listClients = async (req, res) => {
  const workspaceId = text(req.query.workspaceId);
  if (workspaceId && !(await canAccessWorkspace(req, workspaceId))) {
    return res.status(403).json({ message: "You do not have access to this workspace.", code: "FORBIDDEN" });
  }

  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(req.query.pageSize, 10) || DEFAULT_PAGE_SIZE));

  const { rows, total } = await clientModel.findClients({
    workspaceId,
    workspaceIds: workspaceId ? null : await allowedWorkspaceIds(req),
    search: text(req.query.search),
    status: text(req.query.status),
    page,
    pageSize
  });

  const assignees = await ticketModel.findAssigneesByClientIds(rows.map((row) => row.id));
  res.json({
    items: rows.map((row) => mapClient(row, assignees.get(row.id) ?? [])),
    total,
    page,
    pageSize
  });
};

const listClientOptions = async (req, res) => {
  const workspaceId = text(req.query.workspaceId);
  if (workspaceId && !(await canAccessWorkspace(req, workspaceId))) {
    return res.status(403).json({ message: "You do not have access to this workspace.", code: "FORBIDDEN" });
  }

  const options = await clientModel.findClientOptions(workspaceId, workspaceId ? null : await allowedWorkspaceIds(req));

  // Client Desk asks for "mine only": a staff member works the clients they follow.
  const assignees = await ticketModel.findAssigneesByClientIds(options.map((client) => client.id));
  const withFollowers = options.map((client) => ({ ...client, assignees: assignees.get(client.id) ?? [] }));

  if (req.query.assignedOnly === "true" && workspaceId) {
    const seesAll =
      (req.permissions || []).includes("ticket.manage.all") || (await access.resolveScopes(req, workspaceId)).admin;
    if (!seesAll) {
      const mine = new Set(await ticketModel.findClientIdsForEmployee(workspaceId, req.user.employeeId));
      return res.json(withFollowers.filter((client) => mine.has(client.id)));
    }
  }

  res.json(withFollowers);
};

const createClient = async (req, res) => {
  const workspaceId = text(req.body.workspaceId);
  if (!workspaceId || !(await workspaceModel.findWorkspaceById(workspaceId))) {
    return validationFailed(res, "Choose a workspace for this client.", { workspaceId: "Unknown workspace." });
  }
  if (!(await canAccessWorkspace(req, workspaceId))) {
    return res.status(403).json({ message: "You do not have access to this workspace.", code: "FORBIDDEN" });
  }

  const { errors, data } = validateClient(req.body);
  if (Object.keys(errors).length > 0) return validationFailed(res, "Please fix the highlighted fields.", errors);

  const id = await nextId("CLI");
  await clientModel.insertClient({ ...data, id, workspaceId });
  const assigneeIds = idList(req.body.assigneeIds);
  if (assigneeIds.length > 0) await ticketModel.replaceAssignees(id, assigneeIds);

  broadcast(req, workspaceId, "clients", "created");
  const created = await clientModel.findClientById(id);
  res.status(201).json(mapClient(created, (await ticketModel.findAssigneesByClientIds([id])).get(id) ?? []));
};

const updateClient = async (req, res) => {
  const existing = await clientModel.findClientById(req.params.clientId);
  if (!existing) return notFound(res);
  if (!(await canAccessWorkspace(req, existing.workspace_id))) {
    return res.status(403).json({ message: "You do not have access to this workspace.", code: "FORBIDDEN" });
  }

  const { errors, data } = validateClient(req.body, existing);
  if (Object.keys(errors).length > 0) return validationFailed(res, "Please fix the highlighted fields.", errors);

  await clientModel.updateClient(existing.id, data);
  if (req.body.assigneeIds !== undefined) await ticketModel.replaceAssignees(existing.id, idList(req.body.assigneeIds));

  broadcast(req, existing.workspace_id, "clients", "updated");
  const updated = await clientModel.findClientById(existing.id);
  res.json(mapClient(updated, (await ticketModel.findAssigneesByClientIds([existing.id])).get(existing.id) ?? []));
};

const deleteClient = async (req, res) => {
  const existing = await clientModel.findClientById(req.params.clientId);
  if (!existing) return notFound(res);
  if (!(await canAccessWorkspace(req, existing.workspace_id))) {
    return res.status(403).json({ message: "You do not have access to this workspace.", code: "FORBIDDEN" });
  }

  if ((await clientModel.countTasksForClient(existing.id)) > 0) {
    return res.status(400).json({
      message: "This client still has tasks. Reassign or delete them before removing the client.",
      code: "BAD_REQUEST"
    });
  }

  await clientModel.deleteClient(existing.id);
  broadcast(req, existing.workspace_id, "clients", "deleted");
  res.json({ id: existing.id });
};

module.exports = {
  listClients,
  listClientOptions,
  createClient,
  updateClient,
  deleteClient
};
