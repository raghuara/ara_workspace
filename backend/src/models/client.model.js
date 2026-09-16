const pool = require("../config/database");

const CLIENT_SELECT = `
  SELECT
    c.id,
    c.workspace_id,
    c.name,
    c.company,
    c.tone,
    c.contact_name,
    c.email,
    c.phone,
    c.status,
    (SELECT COUNT(*) FROM tasks t WHERE t.client_id = c.id) AS task_count,
    (SELECT COUNT(*) FROM tasks t
       JOIN status_columns sc ON sc.id = t.status_id
      WHERE t.client_id = c.id AND sc.kind <> 'completed') AS open_task_count,
    (SELECT COALESCE(SUM(t.points), 0) FROM tasks t WHERE t.client_id = c.id) AS points
  FROM clients c
`;

const buildFilters = ({ workspaceId, search, status }) => {
  const clauses = [];
  const params = [];

  if (workspaceId) {
    clauses.push("c.workspace_id = ?");
    params.push(workspaceId);
  }

  if (search) {
    const term = `%${search}%`;
    clauses.push("(c.name LIKE ? OR c.company LIKE ? OR c.contact_name LIKE ? OR c.email LIKE ?)");
    params.push(term, term, term, term);
  }

  if (status) {
    clauses.push("c.status = ?");
    params.push(status);
  }

  return { where: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "", params };
};

const findClients = async ({ workspaceId, search, status, page, pageSize }) => {
  const { where, params } = buildFilters({ workspaceId, search, status });
  const offset = (page - 1) * pageSize;

  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM clients c ${where}`, params);
  const [rows] = await pool.query(`${CLIENT_SELECT} ${where} ORDER BY c.name LIMIT ? OFFSET ?`, [
    ...params,
    pageSize,
    offset
  ]);

  return { rows, total };
};

const findClientOptions = async (workspaceId) => {
  const { where, params } = buildFilters({ workspaceId });
  const [rows] = await pool.query(`SELECT id, name, tone FROM clients c ${where} ORDER BY c.name`, params);
  return rows;
};

const findClientById = async (clientId) => {
  const [rows] = await pool.query(`${CLIENT_SELECT} WHERE c.id = ? LIMIT 1`, [clientId]);
  return rows[0] || null;
};

const insertClient = async (client) => {
  await pool.query(
    `INSERT INTO clients (id, workspace_id, name, company, tone, contact_name, email, phone, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      client.id,
      client.workspaceId,
      client.name,
      client.company,
      client.tone,
      client.contactName,
      client.email,
      client.phone,
      client.status
    ]
  );
};

const updateClient = async (clientId, client) => {
  await pool.query(
    `UPDATE clients
     SET name = ?, company = ?, tone = ?, contact_name = ?, email = ?, phone = ?, status = ?
     WHERE id = ?`,
    [client.name, client.company, client.tone, client.contactName, client.email, client.phone, client.status, clientId]
  );
};

const deleteClient = async (clientId) => {
  await pool.query("DELETE FROM clients WHERE id = ?", [clientId]);
};

const countTasksForClient = async (clientId) => {
  const [[{ total }]] = await pool.query("SELECT COUNT(*) AS total FROM tasks WHERE client_id = ?", [clientId]);
  return total;
};

module.exports = {
  findClients,
  findClientOptions,
  findClientById,
  insertClient,
  updateClient,
  deleteClient,
  countTasksForClient
};
