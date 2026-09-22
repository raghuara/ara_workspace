const pool = require("../config/database");

const WORKSPACE_SELECT = `
  SELECT
    w.id,
    w.name,
    w.short_name,
    w.description,
    w.tone,
    w.fiscal_year_start_month,
    w.owner_id,
    DATE_FORMAT(w.created_at, '%Y-%m-%d') AS created_at,
    (SELECT COUNT(*) FROM workspace_groups g WHERE g.workspace_id = w.id) AS group_count,
    (SELECT COUNT(*) FROM workspace_members m WHERE m.workspace_id = w.id) AS member_count,
    (SELECT COUNT(*) FROM tasks t WHERE t.workspace_id = w.id) AS task_count,
    (SELECT COUNT(*) FROM tasks t
       JOIN status_columns c ON c.id = t.status_id
      WHERE t.workspace_id = w.id AND c.kind <> 'completed') AS open_task_count
  FROM workspaces w
`;

const findAllWorkspaces = async () => {
  const [rows] = await pool.query(`${WORKSPACE_SELECT} ORDER BY w.created_at, w.id`);
  return rows;
};

const countWorkspaces = async (connection = pool) => {
  const [[{ total }]] = await connection.query("SELECT COUNT(*) AS total FROM workspaces");
  return Number(total);
};

const countGroups = async (workspaceId, connection = pool) => {
  const [[{ total }]] = await connection.query("SELECT COUNT(*) AS total FROM workspace_groups WHERE workspace_id = ?", [workspaceId]);
  return Number(total);
};

const findWorkspacesForEmployee = async (employeeId) => {
  const [rows] = await pool.query(
    `${WORKSPACE_SELECT}
     WHERE w.owner_id = ?
        OR EXISTS (SELECT 1 FROM workspace_admins a WHERE a.workspace_id = w.id AND a.employee_id = ?)
        OR EXISTS (SELECT 1 FROM workspace_members m WHERE m.workspace_id = w.id AND m.employee_id = ?)
     ORDER BY w.created_at, w.id`,
    [employeeId, employeeId, employeeId]
  );
  return rows;
};

const findWorkspaceIdsForEmployee = async (employeeId) => {
  const [rows] = await pool.query(
    `SELECT w.id FROM workspaces w
     WHERE w.owner_id = ?
        OR EXISTS (SELECT 1 FROM workspace_admins a WHERE a.workspace_id = w.id AND a.employee_id = ?)
        OR EXISTS (SELECT 1 FROM workspace_members m WHERE m.workspace_id = w.id AND m.employee_id = ?)
     ORDER BY w.created_at, w.id`,
    [employeeId, employeeId, employeeId]
  );
  return rows.map((row) => row.id);
};

const findWorkspaceById = async (workspaceId, connection = pool) => {
  const [rows] = await connection.query(`${WORKSPACE_SELECT} WHERE w.id = ? LIMIT 1`, [workspaceId]);
  return rows[0] || null;
};

const findAdminIds = async (workspaceId, connection = pool) => {
  const [rows] = await connection.query(
    "SELECT employee_id FROM workspace_admins WHERE workspace_id = ? ORDER BY employee_id",
    [workspaceId]
  );
  return rows.map((row) => row.employee_id);
};

const findAdminIdsByWorkspace = async (workspaceIds) => {
  if (workspaceIds.length === 0) return new Map();
  const [rows] = await pool.query(
    "SELECT workspace_id, employee_id FROM workspace_admins WHERE workspace_id IN (?) ORDER BY employee_id",
    [workspaceIds]
  );
  const map = new Map();
  rows.forEach((row) => {
    if (!map.has(row.workspace_id)) map.set(row.workspace_id, []);
    map.get(row.workspace_id).push(row.employee_id);
  });
  return map;
};

const insertWorkspace = async (workspace, connection) => {
  await connection.query(
    `INSERT INTO workspaces (id, name, short_name, description, tone, fiscal_year_start_month, owner_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      workspace.id,
      workspace.name,
      workspace.shortName,
      workspace.description,
      workspace.tone,
      workspace.fiscalYearStartMonth,
      workspace.ownerId
    ]
  );
};

const updateWorkspace = async (workspaceId, workspace, connection = pool) => {
  await connection.query(
    `UPDATE workspaces SET name = ?, short_name = ?, description = ?, tone = ?, fiscal_year_start_month = ? WHERE id = ?`,
    [workspace.name, workspace.shortName, workspace.description, workspace.tone, workspace.fiscalYearStartMonth, workspaceId]
  );
};

const replaceAdmins = async (workspaceId, adminIds, connection = pool) => {
  await connection.query("DELETE FROM workspace_admins WHERE workspace_id = ?", [workspaceId]);
  if (adminIds.length > 0) {
    await connection.query("INSERT INTO workspace_admins (workspace_id, employee_id) VALUES ?", [
      adminIds.map((employeeId) => [workspaceId, employeeId])
    ]);
  }
};

const deleteWorkspace = async (workspaceId, connection = pool) => {
  await connection.query("DELETE FROM tasks WHERE workspace_id = ?", [workspaceId]);
  await connection.query("DELETE FROM workspaces WHERE id = ?", [workspaceId]);
};

const isMember = async (workspaceId, employeeId) => {
  const [[{ found }]] = await pool.query(
    `SELECT EXISTS (
       SELECT 1 FROM workspaces w
       WHERE w.id = ?
         AND (w.owner_id = ?
              OR EXISTS (SELECT 1 FROM workspace_admins a WHERE a.workspace_id = w.id AND a.employee_id = ?)
              OR EXISTS (SELECT 1 FROM workspace_members m WHERE m.workspace_id = w.id AND m.employee_id = ?))
     ) AS found`,
    [workspaceId, employeeId, employeeId, employeeId]
  );
  return Boolean(found);
};

const upsertMember = async (member, connection = pool) => {
  await connection.query(
    `INSERT INTO workspace_members (workspace_id, employee_id, user_type_id, group_id, team_id)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       user_type_id = IF(VALUES(user_type_id) < user_type_id, VALUES(user_type_id), user_type_id),
       group_id = COALESCE(VALUES(group_id), group_id),
       team_id = COALESCE(VALUES(team_id), team_id)`,
    [member.workspaceId, member.employeeId, member.userTypeId, member.groupId || null, member.teamId || null]
  );
};

const removeMember = async (workspaceId, employeeId) => {
  await pool.query("DELETE FROM workspace_members WHERE workspace_id = ? AND employee_id = ?", [
    workspaceId,
    employeeId
  ]);
};

const findMembers = async (workspaceId) => {
  const [rows] = await pool.query(
    `SELECT
       m.employee_id,
       m.user_type_id,
       m.group_id,
       m.team_id,
       CONCAT(e.first_name, ' ', e.last_name) AS full_name,
       e.designation,
       e.department,
       ut.name AS user_type_name
     FROM workspace_members m
     JOIN employees e ON e.employee_id = m.employee_id
     JOIN user_types ut ON ut.id = m.user_type_id
     WHERE m.workspace_id = ?
     ORDER BY m.user_type_id, e.first_name, e.last_name`,
    [workspaceId]
  );
  return rows;
};

const findGroups = async (workspaceId) => {
  const [rows] = await pool.query(
    `SELECT g.id, g.workspace_id, g.name, g.tone, g.lead_id,
            CONCAT(l.first_name, ' ', l.last_name) AS lead_name
     FROM workspace_groups g
     LEFT JOIN employees l ON l.employee_id = g.lead_id
     WHERE g.workspace_id = ?
     ORDER BY g.created_at, g.id`,
    [workspaceId]
  );
  return rows;
};

const findGroupById = async (groupId, connection = pool) => {
  const [rows] = await connection.query(
    `SELECT g.id, g.workspace_id, g.name, g.tone, g.lead_id,
            CONCAT(l.first_name, ' ', l.last_name) AS lead_name
     FROM workspace_groups g
     LEFT JOIN employees l ON l.employee_id = g.lead_id
     WHERE g.id = ? LIMIT 1`,
    [groupId]
  );
  return rows[0] || null;
};

const insertGroup = async (group, connection = pool) => {
  await connection.query(
    "INSERT INTO workspace_groups (id, workspace_id, name, tone, lead_id) VALUES (?, ?, ?, ?, ?)",
    [group.id, group.workspaceId, group.name, group.tone, group.leadId]
  );
};

const updateGroup = async (groupId, group, connection = pool) => {
  await connection.query("UPDATE workspace_groups SET name = ?, tone = ?, lead_id = ? WHERE id = ?", [
    group.name,
    group.tone,
    group.leadId,
    groupId
  ]);
};

const deleteGroup = async (groupId) => {
  await pool.query("DELETE FROM workspace_groups WHERE id = ?", [groupId]);
};

const countTasksInGroup = async (groupId) => {
  const [[{ total }]] = await pool.query("SELECT COUNT(*) AS total FROM tasks WHERE group_id = ?", [groupId]);
  return total;
};

const findTeamsByWorkspace = async (workspaceId) => {
  const [rows] = await pool.query(
    `SELECT t.id, t.group_id, t.name, t.lead_id,
            CONCAT(l.first_name, ' ', l.last_name) AS lead_name
     FROM teams t
     JOIN workspace_groups g ON g.id = t.group_id
     LEFT JOIN employees l ON l.employee_id = t.lead_id
     WHERE g.workspace_id = ?
     ORDER BY t.created_at, t.id`,
    [workspaceId]
  );
  return rows;
};

const findTeamById = async (teamId, connection = pool) => {
  const [rows] = await connection.query(
    `SELECT t.id, t.group_id, t.name, t.lead_id, g.workspace_id,
            CONCAT(l.first_name, ' ', l.last_name) AS lead_name
     FROM teams t
     JOIN workspace_groups g ON g.id = t.group_id
     LEFT JOIN employees l ON l.employee_id = t.lead_id
     WHERE t.id = ? LIMIT 1`,
    [teamId]
  );
  return rows[0] || null;
};

const findTeamMembersByWorkspace = async (workspaceId) => {
  const [rows] = await pool.query(
    `SELECT tm.team_id, tm.employee_id, CONCAT(e.first_name, ' ', e.last_name) AS full_name
     FROM team_members tm
     JOIN teams t ON t.id = tm.team_id
     JOIN workspace_groups g ON g.id = t.group_id
     JOIN employees e ON e.employee_id = tm.employee_id
     WHERE g.workspace_id = ?
     ORDER BY e.first_name, e.last_name`,
    [workspaceId]
  );
  return rows;
};

const findTeamMemberIds = async (teamId, connection = pool) => {
  const [rows] = await connection.query(
    "SELECT employee_id FROM team_members WHERE team_id = ? ORDER BY employee_id",
    [teamId]
  );
  return rows.map((row) => row.employee_id);
};

const insertTeam = async (team, connection) => {
  await connection.query("INSERT INTO teams (id, group_id, name, lead_id) VALUES (?, ?, ?, ?)", [
    team.id,
    team.groupId,
    team.name,
    team.leadId
  ]);
};

const updateTeam = async (teamId, team, connection) => {
  await connection.query("UPDATE teams SET name = ?, lead_id = ? WHERE id = ?", [team.name, team.leadId, teamId]);
};

const replaceTeamMembers = async (teamId, memberIds, connection) => {
  await connection.query("DELETE FROM team_members WHERE team_id = ?", [teamId]);
  if (memberIds.length > 0) {
    await connection.query("INSERT INTO team_members (team_id, employee_id) VALUES ?", [
      memberIds.map((employeeId) => [teamId, employeeId])
    ]);
  }
};

const deleteTeam = async (teamId) => {
  await pool.query("DELETE FROM teams WHERE id = ?", [teamId]);
};

const findColumns = async (workspaceId, connection = pool) => {
  const [rows] = await connection.query(
    `SELECT id, workspace_id, name, kind, tone, sort_order, wip_limit, is_default
     FROM status_columns WHERE workspace_id = ? ORDER BY sort_order, id`,
    [workspaceId]
  );
  return rows;
};

const findColumnById = async (columnId, connection = pool) => {
  const [rows] = await connection.query(
    `SELECT id, workspace_id, name, kind, tone, sort_order, wip_limit, is_default
     FROM status_columns WHERE id = ? LIMIT 1`,
    [columnId]
  );
  return rows[0] || null;
};

const insertColumn = async (column, connection = pool) => {
  await connection.query(
    `INSERT INTO status_columns (id, workspace_id, name, kind, tone, sort_order, wip_limit, is_default)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      column.id,
      column.workspaceId,
      column.name,
      column.kind,
      column.tone,
      column.order,
      column.wipLimit,
      column.isDefault
    ]
  );
};

const updateColumn = async (columnId, column) => {
  await pool.query(
    `UPDATE status_columns SET name = ?, tone = ?, sort_order = ?, wip_limit = ? WHERE id = ?`,
    [column.name, column.tone, column.order, column.wipLimit, columnId]
  );
};

const deleteColumn = async (columnId) => {
  await pool.query("DELETE FROM status_columns WHERE id = ?", [columnId]);
};

const countTasksInColumn = async (columnId) => {
  const [[{ total }]] = await pool.query("SELECT COUNT(*) AS total FROM tasks WHERE status_id = ?", [columnId]);
  return total;
};

const employeesExist = async (employeeIds, connection = pool) => {
  if (employeeIds.length === 0) return true;
  const [[{ found }]] = await connection.query(
    "SELECT COUNT(DISTINCT employee_id) AS found FROM employees WHERE employee_id IN (?)",
    [employeeIds]
  );
  return found === employeeIds.length;
};

const findAdminWorkspacesFor = async (employeeId, connection = pool) => {
  const [rows] = await connection.query(
    `SELECT
       w.id,
       w.name,
       w.owner_id = ? AS is_owner,
       (SELECT COUNT(*) FROM workspace_admins x WHERE x.workspace_id = w.id) AS admin_count
     FROM workspaces w
     WHERE w.owner_id = ?
        OR EXISTS (SELECT 1 FROM workspace_admins a WHERE a.workspace_id = w.id AND a.employee_id = ?)
     ORDER BY w.name`,
    [employeeId, employeeId, employeeId]
  );
  return rows.map((row) => ({ id: row.id, name: row.name, isOwner: Boolean(row.is_owner), adminCount: Number(row.admin_count) }));
};

const removeAdminFromWorkspaces = async (employeeId, workspaceIds, userTypeId, connection = pool) => {
  if (workspaceIds.length === 0) return;
  await connection.query("DELETE FROM workspace_admins WHERE employee_id = ? AND workspace_id IN (?)", [employeeId, workspaceIds]);
  await connection.query("UPDATE workspace_members SET user_type_id = ? WHERE employee_id = ? AND workspace_id IN (?)", [
    userTypeId,
    employeeId,
    workspaceIds
  ]);
};

module.exports = {
  findAllWorkspaces,
  countWorkspaces,
  countGroups,
  findWorkspacesForEmployee,
  findWorkspaceIdsForEmployee,
  findWorkspaceById,
  findAdminIds,
  findAdminIdsByWorkspace,
  insertWorkspace,
  updateWorkspace,
  replaceAdmins,
  deleteWorkspace,
  isMember,
  upsertMember,
  removeMember,
  findMembers,
  findGroups,
  findGroupById,
  insertGroup,
  updateGroup,
  deleteGroup,
  countTasksInGroup,
  findTeamsByWorkspace,
  findTeamById,
  findTeamMembersByWorkspace,
  findTeamMemberIds,
  insertTeam,
  updateTeam,
  replaceTeamMembers,
  deleteTeam,
  findColumns,
  findColumnById,
  insertColumn,
  updateColumn,
  deleteColumn,
  countTasksInColumn,
  employeesExist,
  findAdminWorkspacesFor,
  removeAdminFromWorkspaces
};
