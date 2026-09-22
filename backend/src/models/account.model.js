const pool = require("../config/database");

const ACCOUNT_SELECT = `
  SELECT
    e.employee_id,
    e.workspace_id,
    w.name AS workspace_name,
    CONCAT(e.first_name, ' ', e.last_name) AS full_name,
    e.email AS work_email,
    e.department,
    e.designation,
    e.status AS employment_status,
    u.id AS user_id,
    u.email AS login_email,
    u.user_type_id,
    ut.name AS user_type_name,
    u.is_active,
    u.must_change_password,
    DATE_FORMAT(u.last_login_at, '%Y-%m-%dT%H:%i:%s') AS last_login_at,
    DATE_FORMAT(u.created_at, '%Y-%m-%d') AS account_created_at
  FROM employees e
  LEFT JOIN workspaces w ON w.id = e.workspace_id
  LEFT JOIN users u ON u.employee_id = e.employee_id
  LEFT JOIN user_types ut ON ut.id = u.user_type_id
`;

const findAccounts = async ({ search, workspaceId, workspaceIds, includeUnassigned }) => {
  const clauses = [];
  const params = [];

  if (workspaceId) {
    if (includeUnassigned) {
      clauses.push("(e.workspace_id = ? OR e.workspace_id IS NULL)");
    } else {
      clauses.push("e.workspace_id = ?");
    }
    params.push(workspaceId);
  } else if (Array.isArray(workspaceIds)) {
    if (workspaceIds.length === 0) clauses.push("1 = 0");
    else {
      clauses.push("e.workspace_id IN (?)");
      params.push(workspaceIds);
    }
  }

  if (search) {
    const term = `%${search}%`;
    clauses.push("(CONCAT(e.first_name, ' ', e.last_name) LIKE ? OR e.employee_id LIKE ? OR e.email LIKE ? OR e.department LIKE ?)");
    params.push(term, term, term, term);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const [rows] = await pool.query(`${ACCOUNT_SELECT} ${where} ORDER BY u.id IS NULL, e.first_name, e.last_name`, params);
  return rows;
};

const findAccountByEmployeeId = async (employeeId) => {
  const [rows] = await pool.query(`${ACCOUNT_SELECT} WHERE e.employee_id = ? LIMIT 1`, [employeeId]);
  return rows[0] || null;
};

const insertAccount = async ({ employeeId, email, passwordHash, userTypeId }, connection = pool) => {
  await connection.query(
    `INSERT INTO users (employee_id, email, password_hash, user_type_id, is_active, must_change_password)
     VALUES (?, ?, ?, ?, TRUE, TRUE)`,
    [employeeId, email, passwordHash, userTypeId]
  );
};

const updateAccount = async (userId, { userTypeId, isActive }, connection = pool) => {
  await connection.query("UPDATE users SET user_type_id = ?, is_active = ? WHERE id = ?", [userTypeId, isActive, userId]);
};

const setPassword = async (userId, passwordHash, mustChange) => {
  await pool.query("UPDATE users SET password_hash = ?, must_change_password = ? WHERE id = ?", [passwordHash, mustChange, userId]);
};

const touchLastLogin = async (userId) => {
  await pool.query("UPDATE users SET last_login_at = NOW() WHERE id = ?", [userId]);
};

const countActiveUsersOfType = async (userTypeId, excludeUserId = null) => {
  const [[{ total }]] = await pool.query(
    "SELECT COUNT(*) AS total FROM users WHERE user_type_id = ? AND is_active = TRUE AND (? IS NULL OR id <> ?)",
    [userTypeId, excludeUserId, excludeUserId]
  );
  return total;
};

const findLoginsOfType = async (employeeIds, userTypeId) => {
  if (employeeIds.length === 0) return [];
  const [rows] = await pool.query(
    `SELECT u.employee_id, CONCAT(e.first_name, ' ', e.last_name) AS full_name
     FROM users u
     JOIN employees e ON e.employee_id = u.employee_id
     WHERE u.employee_id IN (?) AND u.user_type_id = ?`,
    [employeeIds, userTypeId]
  );
  return rows;
};

const findUserTypes = async () => {
  const [rows] = await pool.query("SELECT id, name, slug, tone, permissions FROM user_types ORDER BY id");
  return rows;
};

module.exports = {
  findLoginsOfType,
  findAccounts,
  findAccountByEmployeeId,
  insertAccount,
  updateAccount,
  setPassword,
  touchLastLogin,
  countActiveUsersOfType,
  findUserTypes
};
