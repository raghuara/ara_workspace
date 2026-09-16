const pool = require("../config/database");

const USER_TYPE_SELECT = `
  SELECT
    ut.id,
    ut.name,
    ut.slug,
    ut.description,
    ut.is_system,
    ut.permissions_locked,
    ut.tone,
    ut.permissions,
    (SELECT COUNT(DISTINCT x.employee_id) FROM (
       SELECT u.employee_id FROM users u WHERE u.user_type_id = ut.id
       UNION
       SELECT m.employee_id FROM workspace_members m WHERE m.user_type_id = ut.id
     ) x) AS member_count
  FROM user_types ut
`;

const findAllUserTypes = async () => {
  const [rows] = await pool.query(`${USER_TYPE_SELECT} ORDER BY ut.id`);
  return rows;
};

const findUserTypeById = async (id) => {
  const [rows] = await pool.query(`${USER_TYPE_SELECT} WHERE ut.id = ? LIMIT 1`, [id]);
  return rows[0] || null;
};

const userTypeNameExists = async (name, excludeId = null) => {
  const [rows] = await pool.query(
    "SELECT id FROM user_types WHERE LOWER(name) = LOWER(?) AND (? IS NULL OR id <> ?) LIMIT 1",
    [name, excludeId, excludeId]
  );
  return rows.length > 0;
};

const findUserTypeMembers = async (userTypeId) => {
  const [rows] = await pool.query(
    `SELECT
       e.employee_id,
       CONCAT(e.first_name, ' ', e.last_name) AS full_name,
       e.designation,
       GROUP_CONCAT(DISTINCT w.short_name ORDER BY w.short_name SEPARATOR ',') AS workspaces
     FROM employees e
     LEFT JOIN users u ON u.employee_id = e.employee_id AND u.user_type_id = ?
     LEFT JOIN workspace_members m ON m.employee_id = e.employee_id AND m.user_type_id = ?
     LEFT JOIN workspaces w ON w.id = m.workspace_id
     WHERE u.id IS NOT NULL OR m.workspace_id IS NOT NULL
     GROUP BY e.employee_id, e.first_name, e.last_name, e.designation
     ORDER BY full_name`,
    [userTypeId, userTypeId]
  );
  return rows;
};

const insertUserType = async (userType) => {
  const [result] = await pool.query(
    `INSERT INTO user_types (name, slug, description, is_system, permissions_locked, tone, permissions)
     VALUES (?, ?, ?, FALSE, FALSE, ?, ?)`,
    [userType.name, userType.slug, userType.description, userType.tone, JSON.stringify(userType.permissions)]
  );
  return result.insertId;
};

const updateUserType = async (id, userType) => {
  await pool.query(
    `UPDATE user_types SET name = ?, slug = ?, description = ?, tone = ?, permissions = ? WHERE id = ?`,
    [userType.name, userType.slug, userType.description, userType.tone, JSON.stringify(userType.permissions), id]
  );
};

const deleteUserType = async (id) => {
  await pool.query("DELETE FROM user_types WHERE id = ?", [id]);
};

const findFeatures = async () => {
  const [rows] = await pool.query("SELECT feature_key, enabled FROM features");
  return Object.fromEntries(rows.map((row) => [row.feature_key, Boolean(row.enabled)]));
};

const setFeature = async (featureKey, enabled) => {
  await pool.query("INSERT INTO features (feature_key, enabled) VALUES (?, ?) ON DUPLICATE KEY UPDATE enabled = VALUES(enabled)", [
    featureKey,
    enabled
  ]);
};

const findAutomationRules = async () => {
  const [rows] = await pool.query("SELECT id, enabled FROM automation_rules");
  return Object.fromEntries(rows.map((row) => [row.id, Boolean(row.enabled)]));
};

const setAutomationRule = async (ruleId, enabled) => {
  await pool.query("INSERT INTO automation_rules (id, enabled) VALUES (?, ?) ON DUPLICATE KEY UPDATE enabled = VALUES(enabled)", [
    ruleId,
    enabled
  ]);
};

module.exports = {
  findAllUserTypes,
  findUserTypeById,
  userTypeNameExists,
  findUserTypeMembers,
  insertUserType,
  updateUserType,
  deleteUserType,
  findFeatures,
  setFeature,
  findAutomationRules,
  setAutomationRule
};
