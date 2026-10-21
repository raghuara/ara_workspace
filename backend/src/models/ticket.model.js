const pool = require("../config/database");

const TICKET_SELECT = `
  SELECT
    t.id,
    t.workspace_id,
    t.client_id,
    t.kind,
    t.title,
    t.description,
    t.status,
    t.priority,
    DATE_FORMAT(t.collected_on, '%Y-%m-%d') AS collected_on,
    DATE_FORMAT(t.due_date, '%Y-%m-%d') AS due_date,
    t.raised_by_id,
    t.owner_id,
    t.reopen_count,
    t.resolved_at,
    t.closed_at,
    t.created_at,
    c.name AS client_name,
    c.tone AS client_tone,
    c.company AS client_company,
    CONCAT(raiser.first_name, ' ', raiser.last_name) AS raised_by_name,
    CONCAT(owner.first_name, ' ', owner.last_name) AS owner_name,
    owner.designation AS owner_designation,
    (t.status NOT IN ('Resolved', 'Closed') AND t.due_date IS NOT NULL AND t.due_date < CURDATE()) AS is_overdue,
    (SELECT COUNT(*) FROM attachments a WHERE a.owner_type = 'ticket' AND a.owner_id = t.id) AS attachment_count
  FROM client_tickets t
  JOIN clients c ON c.id = t.client_id
  LEFT JOIN employees raiser ON raiser.employee_id = t.raised_by_id
  LEFT JOIN employees owner ON owner.employee_id = t.owner_id
`;

const buildFilters = ({ workspaceId, filters = {}, visibleClientIds = null }) => {
  const clauses = ["t.workspace_id = ?"];
  const params = [workspaceId];

  if (visibleClientIds) {
    if (visibleClientIds.length === 0) {
      clauses.push("1 = 0");
    } else {
      clauses.push("t.client_id IN (?)");
      params.push(visibleClientIds);
    }
  }

  if (filters.clientId) {
    clauses.push("t.client_id = ?");
    params.push(filters.clientId);
  }
  if (filters.status) {
    clauses.push("t.status = ?");
    params.push(filters.status);
  }
  if (filters.kind) {
    clauses.push("t.kind = ?");
    params.push(filters.kind);
  }
  if (filters.priority) {
    clauses.push("t.priority = ?");
    params.push(filters.priority);
  }
  if (filters.ownerId) {
    clauses.push("t.owner_id = ?");
    params.push(filters.ownerId);
  }
  if (filters.openOnly) {
    clauses.push("t.status NOT IN ('Resolved', 'Closed')");
  }
  if (filters.overdueOnly) {
    clauses.push("t.status NOT IN ('Resolved', 'Closed') AND t.due_date IS NOT NULL AND t.due_date < CURDATE()");
  }
  if (filters.search) {
    const term = `%${filters.search}%`;
    clauses.push("(t.title LIKE ? OR t.description LIKE ? OR t.id LIKE ? OR c.name LIKE ?)");
    params.push(term, term, term, term);
  }
  if (filters.from && filters.to) {
    clauses.push("(COALESCE(t.collected_on, DATE(t.created_at)) BETWEEN ? AND ? OR t.status NOT IN ('Resolved', 'Closed'))");
    params.push(filters.from, filters.to);
  }

  return { where: `WHERE ${clauses.join(" AND ")}`, params };
};

const findTickets = async ({ workspaceId, filters, visibleClientIds }) => {
  const { where, params } = buildFilters({ workspaceId, filters, visibleClientIds });
  const [rows] = await pool.query(
    `${TICKET_SELECT} ${where}
     ORDER BY FIELD(t.status, 'Reopened', 'New', 'In progress', 'Waiting on client', 'Resolved', 'Closed'),
              t.due_date IS NULL, t.due_date, t.created_at DESC`,
    params
  );
  return rows;
};

const findTicketById = async (ticketId, connection = pool) => {
  const [rows] = await connection.query(`${TICKET_SELECT} WHERE t.id = ? LIMIT 1`, [ticketId]);
  return rows[0] || null;
};

const insertTicket = async (ticket, connection = pool) => {
  await connection.query(
    `INSERT INTO client_tickets
       (id, workspace_id, client_id, kind, title, description, status, priority,
        collected_on, due_date, raised_by_id, owner_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      ticket.id,
      ticket.workspaceId,
      ticket.clientId,
      ticket.kind,
      ticket.title,
      ticket.description,
      ticket.status,
      ticket.priority,
      ticket.collectedOn,
      ticket.dueDate,
      ticket.raisedById,
      ticket.ownerId,
      ticket.createdAt
    ]
  );
};

const COLUMN_FOR_FIELD = {
  clientId: "client_id",
  kind: "kind",
  title: "title",
  description: "description",
  status: "status",
  priority: "priority",
  collectedOn: "collected_on",
  dueDate: "due_date",
  ownerId: "owner_id",
  reopenCount: "reopen_count",
  resolvedAt: "resolved_at",
  closedAt: "closed_at"
};

const updateTicket = async (ticketId, changes, connection = pool) => {
  const entries = Object.entries(changes).filter(([field]) => COLUMN_FOR_FIELD[field]);
  if (entries.length === 0) return;

  const assignments = entries.map(([field]) => `${COLUMN_FOR_FIELD[field]} = ?`);
  await connection.query(`UPDATE client_tickets SET ${assignments.join(", ")} WHERE id = ?`, [
    ...entries.map(([, value]) => value),
    ticketId
  ]);
};

const deleteTicket = async (ticketId) => {
  await pool.query("DELETE FROM client_tickets WHERE id = ?", [ticketId]);
};

const insertEvent = async (event, connection = pool) => {
  await connection.query(
    `INSERT INTO client_ticket_events (ticket_id, workspace_id, actor_id, action, summary, detail, at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      event.ticketId,
      event.workspaceId,
      event.actorId,
      event.action,
      event.summary,
      event.detail ? JSON.stringify(event.detail) : null,
      event.at
    ]
  );
};

const findEvents = async (ticketId) => {
  const [rows] = await pool.query(
    `SELECT e.id, e.ticket_id, e.actor_id, e.action, e.summary, e.detail,
            DATE_FORMAT(e.at, '%Y-%m-%dT%H:%i:%s') AS at,
            CONCAT(emp.first_name, ' ', emp.last_name) AS actor_name
     FROM client_ticket_events e
     LEFT JOIN employees emp ON emp.employee_id = e.actor_id
     WHERE e.ticket_id = ?
     ORDER BY e.at DESC, e.id DESC`,
    [ticketId]
  );
  return rows;
};

const findAssigneesByClientIds = async (clientIds) => {
  if (clientIds.length === 0) return new Map();

  let rows;
  try {
    [rows] = await pool.query(
    `SELECT a.client_id, a.employee_id, a.is_primary,
            CONCAT(e.first_name, ' ', e.last_name) AS full_name,
            e.designation
     FROM client_assignees a
     JOIN employees e ON e.employee_id = a.employee_id
     WHERE a.client_id IN (?)
     ORDER BY a.is_primary DESC, e.first_name`,
      [clientIds]
    );
  } catch (error) {
    // Client Desk may not have been set up yet; clients still list without it.
    if (error.code !== "ER_NO_SUCH_TABLE") throw error;
    return new Map();
  }

  const grouped = new Map();
  rows.forEach((row) => {
    if (!grouped.has(row.client_id)) grouped.set(row.client_id, []);
    grouped.get(row.client_id).push({
      id: row.employee_id,
      fullName: row.full_name,
      designation: row.designation ?? "—",
      isPrimary: Boolean(row.is_primary)
    });
  });
  return grouped;
};

const replaceAssignees = async (clientId, employeeIds, connection = pool) => {
  await connection.query("DELETE FROM client_assignees WHERE client_id = ?", [clientId]);
  if (employeeIds.length === 0) return;

  await connection.query("INSERT INTO client_assignees (client_id, employee_id, is_primary, assigned_at) VALUES ?", [
    employeeIds.map((employeeId, index) => [clientId, employeeId, index === 0, new Date()])
  ]);
};

const handlesAnyClient = async (employeeId) => {
  if (!employeeId) return false;
  try {
    const [rows] = await pool.query("SELECT 1 FROM client_assignees WHERE employee_id = ? LIMIT 1", [employeeId]);
    return rows.length > 0;
  } catch (error) {
    if (error.code !== "ER_NO_SUCH_TABLE") throw error;
    return false;
  }
};

const findClientIdsForEmployee = async (workspaceId, employeeId) => {
  const [rows] = await pool.query(
    `SELECT a.client_id FROM client_assignees a
     JOIN clients c ON c.id = a.client_id
     WHERE a.employee_id = ? AND c.workspace_id = ?`,
    [employeeId, workspaceId]
  );
  return rows.map((row) => row.client_id);
};

module.exports = {
  findTickets,
  findTicketById,
  insertTicket,
  updateTicket,
  deleteTicket,
  insertEvent,
  findEvents,
  findAssigneesByClientIds,
  replaceAssignees,
  findClientIdsForEmployee,
  handlesAnyClient
};
