const pool = require("../config/database");

const findGrants = async (workspaceId, employeeId, connection = pool) => {
  const [rows] = await connection.query(
    "SELECT scope_type, scope_id, level FROM workspace_access WHERE workspace_id = ? AND employee_id = ?",
    [workspaceId, employeeId]
  );
  return rows;
};

const findGrantsForWorkspace = async (workspaceId) => {
  const [rows] = await pool.query(
    "SELECT employee_id, scope_type, scope_id, level FROM workspace_access WHERE workspace_id = ?",
    [workspaceId]
  );
  const map = new Map();
  rows.forEach((row) => {
    if (!map.has(row.employee_id)) map.set(row.employee_id, []);
    map.get(row.employee_id).push({ scope_type: row.scope_type, scope_id: row.scope_id, level: row.level });
  });
  return map;
};

const replaceGrants = async (workspaceId, employeeId, grants, connection = pool) => {
  await connection.query("DELETE FROM workspace_access WHERE workspace_id = ? AND employee_id = ?", [workspaceId, employeeId]);
  if (grants.length > 0) {
    await connection.query("INSERT INTO workspace_access (workspace_id, employee_id, scope_type, scope_id, level) VALUES ?", [
      grants.map((grant) => [workspaceId, employeeId, grant.scopeType, grant.scopeId ?? "", grant.level])
    ]);
  }
};

const grantIfMissing = async ({ workspaceId, employeeId, scopeType, scopeId = "", level }, connection = pool) => {
  await connection.query(
    `INSERT INTO workspace_access (workspace_id, employee_id, scope_type, scope_id, level)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE level = level`,
    [workspaceId, employeeId, scopeType, scopeId, level]
  );
};

const isWorkspaceAdmin = async (workspaceId, employeeId) => {
  const [[{ found }]] = await pool.query(
    `SELECT EXISTS (
       SELECT 1 FROM workspaces w
       WHERE w.id = ? AND (w.owner_id = ? OR EXISTS (SELECT 1 FROM workspace_admins a WHERE a.workspace_id = w.id AND a.employee_id = ?))
     ) AS found`,
    [workspaceId, employeeId, employeeId]
  );
  return Boolean(found);
};

const findTeamGroupMap = async (workspaceId) => {
  const [rows] = await pool.query(
    "SELECT t.id AS team_id, t.group_id FROM teams t JOIN workspace_groups g ON g.id = t.group_id WHERE g.workspace_id = ?",
    [workspaceId]
  );
  return new Map(rows.map((row) => [row.team_id, row.group_id]));
};

module.exports = {
  findGrants,
  findGrantsForWorkspace,
  replaceGrants,
  grantIfMissing,
  isWorkspaceAdmin,
  findTeamGroupMap
};
