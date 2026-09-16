const pool = require("../config/database");

const findEmployeeDirectory = async () => {
  const [rows] = await pool.query(
    `SELECT employee_id AS id, CONCAT(first_name, ' ', last_name) AS full_name, designation, department
     FROM employees`
  );
  return new Map(rows.map((row) => [row.id, { id: row.id, fullName: row.full_name, designation: row.designation, department: row.department }]));
};

const loadWorkspaceSnapshot = async (workspaceId) => {
  const [[workspace]] = await pool.query(
    `SELECT id, name, short_name, description, tone, owner_id, DATE_FORMAT(created_at, '%Y-%m-%d') AS created_at
     FROM workspaces WHERE id = ? LIMIT 1`,
    [workspaceId]
  );
  if (!workspace) return null;

  const [[adminRows], [groups], [teams], [teamMembers], [members], [columns], [clients], [tasks], [assignees], [correctionMoves]] =
    await Promise.all([
      pool.query("SELECT employee_id FROM workspace_admins WHERE workspace_id = ?", [workspaceId]),
      pool.query("SELECT id, workspace_id, name, tone, lead_id FROM workspace_groups WHERE workspace_id = ? ORDER BY created_at, id", [workspaceId]),
      pool.query(
        `SELECT t.id, t.group_id, t.name, t.lead_id FROM teams t
         JOIN workspace_groups g ON g.id = t.group_id WHERE g.workspace_id = ? ORDER BY t.created_at, t.id`,
        [workspaceId]
      ),
      pool.query(
        `SELECT tm.team_id, tm.employee_id FROM team_members tm
         JOIN teams t ON t.id = tm.team_id JOIN workspace_groups g ON g.id = t.group_id WHERE g.workspace_id = ?`,
        [workspaceId]
      ),
      pool.query("SELECT employee_id, user_type_id, group_id, team_id FROM workspace_members WHERE workspace_id = ?", [workspaceId]),
      pool.query("SELECT id, name, kind, tone, sort_order FROM status_columns WHERE workspace_id = ? ORDER BY sort_order, id", [workspaceId]),
      pool.query("SELECT id, name, tone FROM clients WHERE workspace_id = ?", [workspaceId]),
      pool.query(
        `SELECT id, group_id, team_id, client_id, status_id, priority, points,
                DATE_FORMAT(due_date, '%Y-%m-%d') AS due_date
         FROM tasks WHERE workspace_id = ?`,
        [workspaceId]
      ),
      pool.query(
        `SELECT ta.task_id, ta.employee_id FROM task_assignees ta
         JOIN tasks t ON t.id = ta.task_id WHERE t.workspace_id = ?`,
        [workspaceId]
      ),
      pool.query(
        `SELECT task_id FROM task_history
         WHERE workspace_id = ? AND action = 'moved'
           AND JSON_UNQUOTE(JSON_EXTRACT(detail, '$.to')) LIKE '%correction%'`,
        [workspaceId]
      )
    ]);

  const assigneesByTask = new Map();
  assignees.forEach((row) => {
    if (!assigneesByTask.has(row.task_id)) assigneesByTask.set(row.task_id, []);
    assigneesByTask.get(row.task_id).push(row.employee_id);
  });

  const membersByTeam = new Map();
  teamMembers.forEach((row) => {
    if (!membersByTeam.has(row.team_id)) membersByTeam.set(row.team_id, []);
    membersByTeam.get(row.team_id).push(row.employee_id);
  });

  return {
    workspace: {
      id: workspace.id,
      name: workspace.name,
      shortName: workspace.short_name,
      description: workspace.description ?? "",
      tone: workspace.tone,
      ownerId: workspace.owner_id,
      createdAt: workspace.created_at,
      adminIds: adminRows.map((row) => row.employee_id)
    },
    groups: groups.map((row) => ({ id: row.id, workspaceId: row.workspace_id, name: row.name, tone: row.tone, leadId: row.lead_id })),
    teams: teams.map((row) => ({ id: row.id, groupId: row.group_id, name: row.name, leadId: row.lead_id, memberIds: membersByTeam.get(row.id) ?? [] })),
    members: members.map((row) => ({ employeeId: row.employee_id, userTypeId: row.user_type_id, groupId: row.group_id, teamId: row.team_id })),
    columns: columns.map((row) => ({ id: row.id, name: row.name, kind: row.kind, tone: row.tone, order: row.sort_order })),
    clients: clients.map((row) => ({ id: row.id, name: row.name, tone: row.tone })),
    tasks: tasks.map((row) => ({
      id: row.id,
      groupId: row.group_id,
      teamId: row.team_id,
      clientId: row.client_id,
      statusId: row.status_id,
      priority: row.priority,
      points: row.points,
      dueDate: row.due_date,
      assigneeIds: assigneesByTask.get(row.id) ?? []
    })),
    correctionMoveTaskIds: correctionMoves.map((row) => row.task_id)
  };
};

const findEmployeeStats = async () => {
  const [[totals]] = await pool.query(
    `SELECT
       SUM(status <> 'Inactive') AS active,
       SUM(joining_date >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)) AS new_joiners,
       SUM(status = 'Probation') AS on_probation,
       SUM(status = 'Notice Period') AS on_notice
     FROM employees`
  );
  const [departments] = await pool.query(
    "SELECT department, COUNT(*) AS count FROM employees GROUP BY department ORDER BY count DESC, department"
  );
  return { totals, departments };
};

const countActiveEmployees = async () => {
  const [[{ total }]] = await pool.query("SELECT COUNT(*) AS total FROM employees WHERE status <> 'Inactive'");
  return total;
};

const findRecentEmployees = async (limit) => {
  const [rows] = await pool.query(
    `SELECT employee_id, CONCAT(first_name, ' ', last_name) AS full_name, designation, department,
            DATE_FORMAT(joining_date, '%Y-%m-%d') AS joining_date, status
     FROM employees ORDER BY joining_date DESC, employee_id DESC LIMIT ?`,
    [limit]
  );
  return rows;
};

module.exports = {
  findEmployeeDirectory,
  loadWorkspaceSnapshot,
  findEmployeeStats,
  countActiveEmployees,
  findRecentEmployees
};
