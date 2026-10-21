const ticketModel = require("../models/ticket.model");
const clientModel = require("../models/client.model");
const workspaceModel = require("../models/workspace.model");
const access = require("../services/access.service");
const { nextId } = require("../utils/ids");
const { withTransaction } = require("../utils/transaction");
const { broadcastFrom: broadcast } = require("../utils/realtime");
const { TICKET_KINDS, TICKET_STATUSES, OPEN_TICKET_STATUSES } = require("../constants/ticket");
const { PRIORITIES } = require("../constants/workspace");

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const STATUS_SUMMARY = {
  New: "put it back in the queue",
  "In progress": "started work on this",
  "With client": "sent it to the client to check",
  Completed: "marked this completed"
};
const TITLE_MAX = 200;
const DESCRIPTION_MAX = 5000;

const text = (value) => (typeof value === "string" ? value.trim() : "");
const isValidDate = (value) => DATE_PATTERN.test(value) && !Number.isNaN(Date.parse(value));
const parseJson = (value, fallback) => {
  if (value && typeof value === "object") return value;
  if (typeof value !== "string") return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const badRequest = (res, message, errors) =>
  res.status(400).json({ message, code: errors ? "VALIDATION_ERROR" : "BAD_REQUEST", ...(errors && { errors }) });
const notFound = (res, message = "That ticket could not be found.") =>
  res.status(404).json({ message, code: "NOT_FOUND" });
const forbidden = (res, message = "You do not have access to this client.") =>
  res.status(403).json({ message, code: "FORBIDDEN" });

const mapTicket = (row) => ({
  id: row.id,
  token: row.id,
  workspaceId: row.workspace_id,
  clientId: row.client_id,
  clientName: row.client_name,
  clientTone: row.client_tone ?? "slate",
  clientCompany: row.client_company ?? "",
  kind: row.kind,
  title: row.title,
  description: row.description ?? "",
  status: row.status,
  priority: row.priority,
  collectedOn: row.collected_on,
  dueDate: row.due_date,
  raisedById: row.raised_by_id,
  raisedByName: row.raised_by_name ?? "—",
  ownerId: row.owner_id,
  ownerName: row.owner_name ?? "Unassigned",
  ownerDesignation: row.owner_designation ?? "—",
  reopenCount: row.reopen_count,
  resolvedAt: row.resolved_at,
  closedAt: row.closed_at,
  createdAt: row.created_at,
  attachmentCount: row.attachment_count ?? 0,
  isOverdue: Boolean(row.is_overdue),
  isOpen: OPEN_TICKET_STATUSES.includes(row.status)
});

const mapEvent = (row) => ({
  id: row.id,
  ticketId: row.ticket_id,
  actorId: row.actor_id,
  actorName: row.actor_id ? (row.actor_name ?? "Unknown") : "Automation",
  action: row.action,
  summary: row.summary,
  detail: parseJson(row.detail, null),
  at: row.at
});

const can = (req, permission) => (req.permissions || []).includes(permission);

/** Admins and anyone with "every client" see them all; the rest only their own. */
const seesEveryClient = async (req, workspaceId) =>
  can(req, "ticket.manage.all") || (await access.resolveScopes(req, workspaceId)).admin;

const visibleClientsFor = async (req, workspaceId) => {
  if (await seesEveryClient(req, workspaceId)) return null;
  return ticketModel.findClientIdsForEmployee(workspaceId, req.user.employeeId);
};

const ensureWorkspace = async (req, res, workspaceId) => {
  if (!workspaceId) {
    badRequest(res, "Choose a workspace.", { workspaceId: "Workspace is required." });
    return false;
  }
  if (!(await workspaceModel.findWorkspaceById(workspaceId))) {
    notFound(res, "That workspace does not exist.");
    return false;
  }
  if (req.user.userTypeId !== 1 && !(await workspaceModel.isMember(workspaceId, req.user.employeeId))) {
    forbidden(res, "You do not have access to this workspace.");
    return false;
  }
  return true;
};

const canReachClient = async (req, workspaceId, clientId) => {
  const visible = await visibleClientsFor(req, workspaceId);
  return visible === null || visible.includes(clientId);
};

const loadReachableTicket = async (req, res) => {
  const row = await ticketModel.findTicketById(req.params.ticketId);
  if (!row) {
    notFound(res);
    return null;
  }
  if (!(await ensureWorkspace(req, res, row.workspace_id))) return null;
  if (!(await canReachClient(req, row.workspace_id, row.client_id))) {
    forbidden(res, "This ticket belongs to a client that is not assigned to you.");
    return null;
  }
  return row;
};

const validate = async (body, { existing = null, workspaceId }) => {
  const errors = {};
  const changes = {};
  const has = (field) => body[field] !== undefined;

  if (has("clientId") || !existing) {
    changes.clientId = text(body.clientId);
    if (!changes.clientId) errors.clientId = "Choose the client this came from.";
    else {
      const client = await clientModel.findClientById(changes.clientId);
      if (!client || client.workspace_id !== workspaceId) errors.clientId = "That client does not exist.";
    }
  }

  if (has("title") || !existing) {
    changes.title = text(body.title).slice(0, TITLE_MAX);
    if (!changes.title) errors.title = "A short heading is required.";
  }

  if (has("description")) changes.description = text(body.description).slice(0, DESCRIPTION_MAX) || null;

  if (has("kind") || !existing) {
    changes.kind = text(body.kind) || "Requirement";
    if (!TICKET_KINDS.includes(changes.kind)) errors.kind = "Unknown type.";
  }

  if (has("priority") || !existing) {
    changes.priority = text(body.priority) || "Normal";
    if (!PRIORITIES.includes(changes.priority)) errors.priority = "Unknown priority.";
  }

  for (const field of ["collectedOn", "dueDate"]) {
    if (has(field) || !existing) {
      changes[field] = text(body[field]) || null;
      if (changes[field] && !isValidDate(changes[field])) errors[field] = "Use the format YYYY-MM-DD.";
    }
  }

  if (changes.collectedOn && changes.dueDate && changes.dueDate < changes.collectedOn) {
    errors.dueDate = "The due date cannot be before the date it was collected.";
  }

  if (has("ownerId")) changes.ownerId = text(body.ownerId) || null;

  return { errors, changes };
};

const listTickets = async (req, res) => {
  const workspaceId = text(req.query.workspaceId);
  if (!(await ensureWorkspace(req, res, workspaceId))) return;

  const filters = {
    clientId: text(req.query.clientId),
    status: TICKET_STATUSES.includes(req.query.status) ? req.query.status : "",
    kind: TICKET_KINDS.includes(req.query.kind) ? req.query.kind : "",
    priority: PRIORITIES.includes(req.query.priority) ? req.query.priority : "",
    ownerId: text(req.query.ownerId),
    search: text(req.query.search),
    openOnly: req.query.openOnly === "true",
    overdueOnly: req.query.overdueOnly === "true",
    from: text(req.query.from),
    to: text(req.query.to)
  };

  const rows = await ticketModel.findTickets({
    workspaceId,
    filters,
    visibleClientIds: await visibleClientsFor(req, workspaceId)
  });

  res.json(rows.map(mapTicket));
};

const getTicket = async (req, res) => {
  const row = await loadReachableTicket(req, res);
  if (!row) return;

  res.json(mapTicket(row));
};

const getTicketEvents = async (req, res) => {
  const row = await loadReachableTicket(req, res);
  if (!row) return;

  res.json((await ticketModel.findEvents(row.id)).map(mapEvent));
};

const createTicket = async (req, res) => {
  const workspaceId = text(req.body.workspaceId);
  if (!(await ensureWorkspace(req, res, workspaceId))) return;

  const { errors, changes } = await validate(req.body, { workspaceId });
  if (Object.keys(errors).length > 0) return badRequest(res, "Please fix the highlighted fields.", errors);
  if (!(await canReachClient(req, workspaceId, changes.clientId))) {
    return forbidden(res, "That client is not assigned to you.");
  }

  const followers = await ticketModel.findAssigneesByClientIds([changes.clientId]);
  const handlerId = changes.ownerId || followers.get(changes.clientId)?.[0]?.id || null;
  if (!handlerId) {
    return badRequest(res, "Nobody handles this client yet.", {
      clientId: "Pick who handles this client on the Clients page, then raise the ticket."
    });
  }

  const now = new Date();
  const ticketId = await withTransaction(async (connection) => {
    const id = await nextId("TKT", connection);

    await ticketModel.insertTicket(
      {
        id,
        workspaceId,
        clientId: changes.clientId,
        kind: changes.kind,
        title: changes.title,
        description: changes.description ?? null,
        status: "New",
        priority: changes.priority,
        collectedOn: changes.collectedOn,
        dueDate: changes.dueDate,
        raisedById: req.user.employeeId ?? null,
        ownerId: handlerId,
        createdAt: now
      },
      connection
    );

    await ticketModel.insertEvent(
      {
        ticketId: id,
        workspaceId,
        actorId: req.user.employeeId,
        action: "created",
        summary: `raised this ${changes.kind.toLowerCase()}`,
        detail: { kind: changes.kind, dueDate: changes.dueDate },
        at: now
      },
      connection
    );

    return id;
  });

  broadcast(req, workspaceId, "tickets", "created", { ticketId });
  res.status(201).json(mapTicket(await ticketModel.findTicketById(ticketId)));
};

const updateTicket = async (req, res) => {
  const existing = await loadReachableTicket(req, res);
  if (!existing) return;

  const { errors, changes } = await validate(req.body, { existing, workspaceId: existing.workspace_id });
  if (Object.keys(errors).length > 0) return badRequest(res, "Please fix the highlighted fields.", errors);
  if (changes.clientId && !(await canReachClient(req, existing.workspace_id, changes.clientId))) {
    return forbidden(res, "That client is not assigned to you.");
  }

  const before = mapTicket(existing);
  const changed = Object.keys(changes).filter(
    (field) => JSON.stringify(changes[field] ?? null) !== JSON.stringify(before[field] ?? null)
  );

  if (changed.length > 0) {
    await withTransaction(async (connection) => {
      await ticketModel.updateTicket(existing.id, changes, connection);
      await ticketModel.insertEvent(
        {
          ticketId: existing.id,
          workspaceId: existing.workspace_id,
          actorId: req.user.employeeId,
          action: "updated",
          summary: "updated the details",
          detail: { fields: changed },
          at: new Date()
        },
        connection
      );
    });
  }

  broadcast(req, existing.workspace_id, "tickets", "updated", { ticketId: existing.id });
  res.json(mapTicket(await ticketModel.findTicketById(existing.id)));
};

const changeStatus = async (req, res) => {
  const existing = await loadReachableTicket(req, res);
  if (!existing) return;

  const status = text(req.body.status);
  if (!TICKET_STATUSES.includes(status)) return badRequest(res, "Unknown status.", { status: "Unknown status." });
  if (status === existing.status) return res.json(mapTicket(existing));

  const note = text(req.body.note).slice(0, 1000);
  const reopening = status === "Reopened";
  if (reopening && !note) {
    return badRequest(res, "Say what the client asked for.", { note: "A reason is required when it comes back." });
  }

  const now = new Date();
  const changes = { status };
  if (status === "With client") {
    changes.resolvedAt = now;
    changes.closedAt = null;
  }
  if (status === "Completed") {
    changes.closedAt = now;
    if (!existing.resolved_at) changes.resolvedAt = now;
  }
  if (status === "In progress") {
    changes.resolvedAt = null;
    changes.closedAt = null;
  }
  if (reopening) {
    changes.reopenCount = (existing.reopen_count ?? 0) + 1;
    changes.resolvedAt = null;
    changes.closedAt = null;
    if (text(req.body.dueDate) && isValidDate(text(req.body.dueDate))) changes.dueDate = text(req.body.dueDate);
  }

  await withTransaction(async (connection) => {
    await ticketModel.updateTicket(existing.id, changes, connection);
    await ticketModel.insertEvent(
      {
        ticketId: existing.id,
        workspaceId: existing.workspace_id,
        actorId: req.user.employeeId,
        action: reopening ? "reopened" : "status",
        summary: reopening ? `sent it back for round ${changes.reopenCount + 1}` : STATUS_SUMMARY[status],
        detail: { from: existing.status, to: status, ...(note ? { note } : {}) },
        at: now
      },
      connection
    );
  });

  broadcast(req, existing.workspace_id, "tickets", reopening ? "reopened" : "status", { ticketId: existing.id });
  res.json(mapTicket(await ticketModel.findTicketById(existing.id)));
};

const addNote = async (req, res) => {
  const existing = await loadReachableTicket(req, res);
  if (!existing) return;

  const note = text(req.body.note).slice(0, 2000);
  if (!note) return badRequest(res, "Write something before saving.", { note: "A note cannot be empty." });

  await ticketModel.insertEvent({
    ticketId: existing.id,
    workspaceId: existing.workspace_id,
    actorId: req.user.employeeId,
    action: "note",
    summary: "added an update",
    detail: { note },
    at: new Date()
  });

  broadcast(req, existing.workspace_id, "tickets", "note", { ticketId: existing.id });
  res.status(201).json((await ticketModel.findEvents(existing.id)).map(mapEvent)[0] ?? null);
};

const deleteTicket = async (req, res) => {
  const existing = await loadReachableTicket(req, res);
  if (!existing) return;
  if (!(await access.resolveScopes(req, existing.workspace_id)).admin) {
    return forbidden(res, "Only an admin can delete a ticket.");
  }

  await ticketModel.deleteTicket(existing.id);
  broadcast(req, existing.workspace_id, "tickets", "deleted", { ticketId: existing.id });
  res.json({ id: existing.id });
};

module.exports = {
  listTickets,
  getTicket,
  getTicketEvents,
  createTicket,
  updateTicket,
  changeStatus,
  addNote,
  deleteTicket
};
