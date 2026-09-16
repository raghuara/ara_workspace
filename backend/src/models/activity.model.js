const pool = require("../config/database");

const ACTIVITY_SELECT = `
  SELECT
    h.id,
    h.task_id,
    h.workspace_id,
    h.actor_id,
    h.action,
    h.summary,
    h.detail,
    DATE_FORMAT(h.at, '%Y-%m-%dT%H:%i:%s') AS at,
    CONCAT(e.first_name, ' ', e.last_name) AS actor_name,
    t.title AS task_title,
    c.name AS client_name,
    c.tone AS client_tone
  FROM task_history h
  LEFT JOIN employees e ON e.employee_id = h.actor_id
  LEFT JOIN tasks t ON t.id = h.task_id
  LEFT JOIN clients c ON c.id = t.client_id
`;

const buildFilters = ({ workspaceIds, workspaceId, search, action, actorId }) => {
  const clauses = [];
  const params = [];

  if (workspaceIds) {
    if (workspaceIds.length === 0) clauses.push("1 = 0");
    else {
      clauses.push("h.workspace_id IN (?)");
      params.push(workspaceIds);
    }
  }
  if (workspaceId) {
    clauses.push("h.workspace_id = ?");
    params.push(workspaceId);
  }
  if (action) {
    clauses.push("h.action = ?");
    params.push(action);
  }
  if (actorId) {
    clauses.push("h.actor_id = ?");
    params.push(actorId);
  }
  if (search) {
    const term = `%${search}%`;
    clauses.push("(t.title LIKE ? OR CONCAT(e.first_name, ' ', e.last_name) LIKE ? OR h.summary LIKE ?)");
    params.push(term, term, term);
  }

  return { where: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "", params };
};

const findActivity = async ({ filters, page, pageSize }) => {
  const { where, params } = buildFilters(filters);
  const offset = (page - 1) * pageSize;

  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM task_history h
     LEFT JOIN employees e ON e.employee_id = h.actor_id
     LEFT JOIN tasks t ON t.id = h.task_id ${where}`,
    params
  );
  const [rows] = await pool.query(`${ACTIVITY_SELECT} ${where} ORDER BY h.at DESC, h.id DESC LIMIT ? OFFSET ?`, [
    ...params,
    pageSize,
    offset
  ]);

  return { rows, total };
};

const findActors = async ({ workspaceIds, workspaceId }) => {
  const { where, params } = buildFilters({ workspaceIds, workspaceId });
  const [rows] = await pool.query(
    `SELECT DISTINCT h.actor_id AS id, CONCAT(e.first_name, ' ', e.last_name) AS full_name
     FROM task_history h
     JOIN employees e ON e.employee_id = h.actor_id
     ${where}
     ORDER BY full_name`,
    params
  );
  return rows;
};

module.exports = {
  findActivity,
  findActors
};
