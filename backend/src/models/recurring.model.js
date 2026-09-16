const pool = require("../config/database");

const RULE_SELECT = `
  SELECT
    r.id,
    r.workspace_id,
    r.group_id,
    r.team_id,
    r.client_id,
    r.title,
    r.description,
    r.priority,
    r.size_key,
    r.points,
    r.per_assignee,
    r.frequency,
    r.weekdays,
    r.month_days,
    r.due_offset_days,
    DATE_FORMAT(r.start_date, '%Y-%m-%d') AS start_date,
    DATE_FORMAT(r.end_date, '%Y-%m-%d') AS end_date,
    r.is_active,
    DATE_FORMAT(r.last_run_on, '%Y-%m-%d') AS last_run_on,
    r.created_count,
    r.created_by_id,
    DATE_FORMAT(r.created_at, '%Y-%m-%d') AS created_at,
    CONCAT(cb.first_name, ' ', cb.last_name) AS created_by_name,
    cl.name AS client_name,
    cl.tone AS client_tone,
    g.name AS group_name,
    g.tone AS group_tone,
    tm.name AS team_name
  FROM recurring_tasks r
  LEFT JOIN employees cb ON cb.employee_id = r.created_by_id
  LEFT JOIN clients cl ON cl.id = r.client_id
  LEFT JOIN workspace_groups g ON g.id = r.group_id
  LEFT JOIN teams tm ON tm.id = r.team_id
`;

const findRulesByWorkspace = async (workspaceId) => {
  const [rows] = await pool.query(`${RULE_SELECT} WHERE r.workspace_id = ? ORDER BY r.is_active DESC, r.created_at DESC, r.id DESC`, [
    workspaceId
  ]);
  return rows;
};

const findRuleById = async (ruleId, connection = pool) => {
  const [rows] = await connection.query(`${RULE_SELECT} WHERE r.id = ? LIMIT 1`, [ruleId]);
  return rows[0] || null;
};

const findDueRules = async (workspaceId, connection = pool) => {
  const [rows] = await connection.query(
    `${RULE_SELECT}
     WHERE r.workspace_id = ? AND r.is_active = TRUE
       AND r.start_date <= CURDATE()
       AND (r.end_date IS NULL OR r.end_date >= CURDATE())
       AND (r.last_run_on IS NULL OR r.last_run_on < CURDATE())`,
    [workspaceId]
  );
  return rows;
};

const findAssigneesByRuleIds = async (ruleIds, connection = pool) => {
  if (ruleIds.length === 0) return new Map();
  const [rows] = await connection.query(
    `SELECT ra.rule_id, ra.employee_id, CONCAT(e.first_name, ' ', e.last_name) AS full_name
     FROM recurring_task_assignees ra
     JOIN employees e ON e.employee_id = ra.employee_id
     WHERE ra.rule_id IN (?)
     ORDER BY e.first_name, e.last_name`,
    [ruleIds]
  );
  const map = new Map();
  rows.forEach((row) => {
    if (!map.has(row.rule_id)) map.set(row.rule_id, []);
    map.get(row.rule_id).push({ id: row.employee_id, fullName: row.full_name });
  });
  return map;
};

const insertRule = async (rule, connection) => {
  await connection.query(
    `INSERT INTO recurring_tasks
       (id, workspace_id, group_id, team_id, client_id, title, description, priority, size_key, points,
        per_assignee, frequency, weekdays, month_days, due_offset_days, start_date, end_date, is_active, created_by_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, ?)`,
    [
      rule.id,
      rule.workspaceId,
      rule.groupId,
      rule.teamId,
      rule.clientId,
      rule.title,
      rule.description,
      rule.priority,
      rule.sizeKey,
      rule.points,
      rule.perAssignee,
      rule.schedule.frequency,
      JSON.stringify(rule.schedule.weekdays),
      JSON.stringify(rule.schedule.monthDays),
      rule.dueOffsetDays,
      rule.startDate,
      rule.endDate,
      rule.createdById
    ]
  );
};

const updateRule = async (ruleId, rule, connection) => {
  await connection.query(
    `UPDATE recurring_tasks
     SET group_id = ?, team_id = ?, client_id = ?, title = ?, description = ?, priority = ?, size_key = ?, points = ?,
         per_assignee = ?, frequency = ?, weekdays = ?, month_days = ?, due_offset_days = ?, start_date = ?, end_date = ?
     WHERE id = ?`,
    [
      rule.groupId,
      rule.teamId,
      rule.clientId,
      rule.title,
      rule.description,
      rule.priority,
      rule.sizeKey,
      rule.points,
      rule.perAssignee,
      rule.schedule.frequency,
      JSON.stringify(rule.schedule.weekdays),
      JSON.stringify(rule.schedule.monthDays),
      rule.dueOffsetDays,
      rule.startDate,
      rule.endDate,
      ruleId
    ]
  );
};

const replaceAssignees = async (ruleId, employeeIds, connection) => {
  await connection.query("DELETE FROM recurring_task_assignees WHERE rule_id = ?", [ruleId]);
  if (employeeIds.length > 0) {
    await connection.query("INSERT INTO recurring_task_assignees (rule_id, employee_id) VALUES ?", [
      employeeIds.map((employeeId) => [ruleId, employeeId])
    ]);
  }
};

const setActive = async (ruleId, isActive) => {
  await pool.query("UPDATE recurring_tasks SET is_active = ? WHERE id = ?", [isActive, ruleId]);
};

const markRun = async (ruleId, createdCount, connection) => {
  await connection.query(
    "UPDATE recurring_tasks SET last_run_on = CURDATE(), created_count = created_count + ? WHERE id = ?",
    [createdCount, ruleId]
  );
};

const deleteRule = async (ruleId) => {
  await pool.query("DELETE FROM recurring_tasks WHERE id = ?", [ruleId]);
};

module.exports = {
  findRulesByWorkspace,
  findRuleById,
  findDueRules,
  findAssigneesByRuleIds,
  insertRule,
  updateRule,
  replaceAssignees,
  setActive,
  markRun,
  deleteRule
};
