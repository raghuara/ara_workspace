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
        `SELECT tm.team_id, tm.employee_id, tm.role FROM team_members tm
         JOIN teams t ON t.id = tm.team_id JOIN workspace_groups g ON g.id = t.group_id WHERE g.workspace_id = ?`,
        [workspaceId]
      ),
      pool.query("SELECT employee_id, user_type_id, group_id, team_id FROM workspace_members WHERE workspace_id = ?", [workspaceId]),
      pool.query("SELECT id, name, kind, tone, sort_order FROM status_columns WHERE workspace_id = ? ORDER BY sort_order, id", [workspaceId]),
      pool.query("SELECT id, name, tone FROM clients WHERE workspace_id = ?", [workspaceId]),
      pool.query(
        `SELECT id, group_id, team_id, client_id, status_id, priority, points,
                DATE_FORMAT(due_date, '%Y-%m-%d') AS due_date,
                DATE_FORMAT(completed_at, '%Y-%m-%d') AS completed_at,
                DATE_FORMAT(created_at, '%Y-%m-%d') AS created_at
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
  const supervisorsByTeam = new Map();
  teamMembers.forEach((row) => {
    if (!membersByTeam.has(row.team_id)) membersByTeam.set(row.team_id, []);
    membersByTeam.get(row.team_id).push(row.employee_id);
    if (row.role === 'supervisor') {
      if (!supervisorsByTeam.has(row.team_id)) supervisorsByTeam.set(row.team_id, []);
      supervisorsByTeam.get(row.team_id).push(row.employee_id);
    }
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
    teams: teams.map((row) => ({ id: row.id, groupId: row.group_id, name: row.name, leadId: row.lead_id, memberIds: membersByTeam.get(row.id) ?? [], supervisorIds: supervisorsByTeam.get(row.id) ?? [] })),
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
      completedAt: row.completed_at,
      createdAt: row.created_at,
      assigneeIds: assigneesByTask.get(row.id) ?? []
    })),
    correctionMoveTaskIds: correctionMoves.map((row) => row.task_id)
  };
};

const ARRIVAL_DAY = "GREATEST(t.created_at, COALESCE(t.scheduled_date, t.created_at))";
const TOUCHES_PERIOD = `t.workspace_id = ? AND ${ARRIVAL_DAY} <= ? AND (t.completed_at IS NULL OR t.completed_at >= ?)`;
const NEXT_DAY = "DATE_ADD(?, INTERVAL 1 DAY)";

const TRACKER_LISTS = ["assigned", "corrections", "completed", "inProgress", "inReview", "overdue", "complaints", "requirementsDone"];

const daysBetween = (from, to) => {
  const days = [];
  const cursor = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  while (cursor <= end) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
};

const groupBy = (rows, key) =>
  rows.reduce((map, row) => {
    if (!map.has(row[key])) map.set(row[key], []);
    map.get(row[key]).push(row);
    return map;
  }, new Map());

const TASK_FIELDS = `t.id, t.title, t.client_id, t.priority,
  DATE_FORMAT(t.due_date, '%Y-%m-%d') AS due_date,
  DATE_FORMAT(${ARRIVAL_DAY}, '%Y-%m-%d') AS arrival,
  DATE_FORMAT(t.completed_at, '%Y-%m-%d') AS completed_at,
  sc.kind, sc.name AS status_name, sc.tone AS status_tone`;

const loadTracker = async (workspaceId, from, to, { includeTickets = false } = {}) => {
  const range = [workspaceId, to, from];
  const [
    [groups],
    [teams],
    [teamMembers],
    [columns],
    [clients],
    [handling],
    [tasks],
    [assignees],
    [statusMoves],
    [correctionMoves],
    [tickets]
  ] = await Promise.all([
    pool.query("SELECT id, name, tone FROM workspace_groups WHERE workspace_id = ? ORDER BY created_at, id", [workspaceId]),
    pool.query(
      `SELECT t.id, t.name, t.lead_id, t.group_id FROM teams t
       JOIN workspace_groups g ON g.id = t.group_id WHERE g.workspace_id = ? ORDER BY g.created_at, t.created_at, t.id`,
      [workspaceId]
    ),
    pool.query(
      `SELECT tm.team_id, tm.employee_id, tm.role FROM team_members tm
       JOIN teams t ON t.id = tm.team_id JOIN workspace_groups g ON g.id = t.group_id WHERE g.workspace_id = ?`,
      [workspaceId]
    ),
    pool.query("SELECT name, kind FROM status_columns WHERE workspace_id = ?", [workspaceId]),
    pool.query("SELECT id, name, company, tone, status FROM clients WHERE workspace_id = ?", [workspaceId]),
    pool.query(
      `SELECT ca.client_id, ca.employee_id, ca.is_primary, DATE_FORMAT(ca.assigned_at, '%Y-%m-%d') AS since
       FROM client_assignees ca JOIN clients c ON c.id = ca.client_id
       WHERE c.workspace_id = ? AND c.status <> 'Inactive' AND ca.assigned_at < ${NEXT_DAY}`,
      [workspaceId, to]
    ),
    pool.query(`SELECT ${TASK_FIELDS} FROM tasks t JOIN status_columns sc ON sc.id = t.status_id WHERE ${TOUCHES_PERIOD}`, range),
    pool.query(
      `SELECT ta.task_id, ta.employee_id FROM tasks t JOIN task_assignees ta ON ta.task_id = t.id WHERE ${TOUCHES_PERIOD}`,
      range
    ),
    pool.query(
      `SELECT h.task_id, DATE_FORMAT(h.at, '%Y-%m-%d') AS day,
              JSON_UNQUOTE(JSON_EXTRACT(h.detail, '$.from')) AS from_name,
              JSON_UNQUOTE(JSON_EXTRACT(h.detail, '$.to')) AS to_name
       FROM task_history h JOIN tasks t ON t.id = h.task_id
       WHERE ${TOUCHES_PERIOD} AND h.action IN ('moved', 'completed')
       ORDER BY h.at, h.id`,
      range
    ),
    pool.query(
      `SELECT h.task_id, DATE_FORMAT(h.at, '%Y-%m-%d') AS day, JSON_UNQUOTE(JSON_EXTRACT(h.detail, '$.to')) AS to_name
       FROM task_history h
       WHERE h.workspace_id = ? AND h.action = 'moved' AND h.at >= ? AND h.at < ${NEXT_DAY}`,
      [workspaceId, from, to]
    ),
    includeTickets
      ? pool.query(
          `SELECT id, title, kind, status, client_id, owner_id,
                  DATE_FORMAT(created_at, '%Y-%m-%d') AS created_day,
                  DATE_FORMAT(closed_at, '%Y-%m-%d') AS closed_day
           FROM client_tickets
           WHERE workspace_id = ? AND owner_id IS NOT NULL AND (
             (kind = 'Complaint' AND created_at >= ? AND created_at < ${NEXT_DAY})
             OR (kind = 'Requirement' AND status = 'Completed' AND closed_at >= ? AND closed_at < ${NEXT_DAY}))`,
          [workspaceId, from, to, from, to]
        )
      : Promise.resolve([[]])
  ]);

  const kindByName = new Map(columns.map((row) => [row.name, row.kind]));
  const correctionNames = new Set(columns.filter((row) => row.kind === "correction").map((row) => row.name));
  const taskById = new Map(tasks.map((row) => [row.id, row]));
  const assigneesByTask = new Map();
  assignees.forEach((row) => {
    if (!assigneesByTask.has(row.task_id)) assigneesByTask.set(row.task_id, []);
    assigneesByTask.get(row.task_id).push(row.employee_id);
  });
  const movesByTask = groupBy(statusMoves, "task_id");

  const corrections = correctionMoves.filter((row) => correctionNames.has(row.to_name));
  const missing = [...new Set(corrections.map((row) => row.task_id))].filter((id) => !taskById.has(id));
  if (missing.length) {
    const [[extraTasks], [extraAssignees]] = await Promise.all([
      pool.query(`SELECT ${TASK_FIELDS} FROM tasks t JOIN status_columns sc ON sc.id = t.status_id WHERE t.id IN (?)`, [missing]),
      pool.query("SELECT task_id, employee_id FROM task_assignees WHERE task_id IN (?)", [missing])
    ]);
    extraTasks.forEach((row) => taskById.set(row.id, row));
    extraAssignees.forEach((row) => {
      if (!assigneesByTask.has(row.task_id)) assigneesByTask.set(row.task_id, []);
      assigneesByTask.get(row.task_id).push(row.employee_id);
    });
  }

  const kindAt = (task, day) => {
    const history = movesByTask.get(task.id);
    if (!history?.length) return task.kind;
    let last = null;
    for (const move of history) {
      if (move.day > day) break;
      last = move;
    }
    if (last) return kindByName.get(last.to_name) ?? task.kind;
    return kindByName.get(history[0].from_name) ?? task.kind;
  };

  const cells = new Map();
  const add = (day, employeeId, list, itemId) => {
    const key = `${day}|${employeeId}`;
    if (!cells.has(key)) {
      cells.set(key, { date: day, id: employeeId, ...Object.fromEntries(TRACKER_LISTS.map((name) => [name, []])) });
    }
    cells.get(key)[list].push(itemId);
  };
  const forAssignees = (taskId, callback) => (assigneesByTask.get(taskId) ?? []).forEach(callback);

  const days = daysBetween(from, to);
  tasks.forEach((task) => {
    if (task.arrival >= from) forAssignees(task.id, (employeeId) => add(task.arrival, employeeId, "assigned", task.id));
    if (task.completed_at && task.completed_at >= from && task.completed_at <= to) {
      forAssignees(task.id, (employeeId) => add(task.completed_at, employeeId, "completed", task.id));
    }
    if (task.kind === "completed" && !task.completed_at) return;

    days.forEach((day) => {
      if (task.arrival > day || (task.completed_at && task.completed_at <= day)) return;
      const inReview = kindAt(task, day) === "review";
      const overdue = Boolean(task.due_date) && task.due_date < day;
      forAssignees(task.id, (employeeId) => {
        add(day, employeeId, "inProgress", task.id);
        if (inReview) add(day, employeeId, "inReview", task.id);
        if (overdue) add(day, employeeId, "overdue", task.id);
      });
    });
  });

  corrections.forEach((move) => forAssignees(move.task_id, (employeeId) => add(move.day, employeeId, "corrections", move.task_id)));

  tickets.forEach((ticket) => {
    if (ticket.kind === "Complaint") add(ticket.created_day, ticket.owner_id, "complaints", ticket.id);
    else add(ticket.closed_day, ticket.owner_id, "requirementsDone", ticket.id);
  });

  return {
    groups: groups.map((row) => ({ id: row.id, name: row.name, tone: row.tone })),
    teams: teams.map((row) => ({ id: row.id, name: row.name, leadId: row.lead_id, groupId: row.group_id })),
    teamMembers: teamMembers.map((row) => ({ teamId: row.team_id, employeeId: row.employee_id, role: row.role })),
    entries: [...cells.values()],
    tasks: [...taskById.values()].map((row) => ({
      id: row.id,
      title: row.title,
      clientId: row.client_id,
      priority: row.priority,
      dueDate: row.due_date,
      completedAt: row.completed_at,
      statusName: row.status_name,
      statusTone: row.status_tone
    })),
    clients: clients.map((row) => ({ id: row.id, name: row.name, company: row.company, tone: row.tone, status: row.status })),
    handling: handling.map((row) => ({
      clientId: row.client_id,
      employeeId: row.employee_id,
      isPrimary: Boolean(row.is_primary),
      since: row.since
    })),
    tickets: tickets.map((row) => ({
      id: row.id,
      title: row.title,
      kind: row.kind,
      status: row.status,
      clientId: row.client_id,
      createdAt: row.created_day,
      closedAt: row.closed_day
    }))
  };
};

const scopeClause = (workspaceIds) => {
  if (workspaceIds === null) return { where: "", params: [] };
  if (workspaceIds.length === 0) return { where: " WHERE 1 = 0", params: [] };
  return { where: " WHERE workspace_id IN (?)", params: [workspaceIds] };
};

const findEmployeeStats = async (workspaceIds = null) => {
  const scope = scopeClause(workspaceIds);
  const [[totals]] = await pool.query(
    `SELECT
       SUM(status <> 'Inactive') AS active,
       SUM(joining_date >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)) AS new_joiners,
       SUM(status = 'Probation') AS on_probation,
       SUM(status = 'Notice Period') AS on_notice
     FROM employees${scope.where}`,
    scope.params
  );
  const [departments] = await pool.query(
    `SELECT department, COUNT(*) AS count FROM employees${scope.where} GROUP BY department ORDER BY count DESC, department`,
    scope.params
  );
  return { totals, departments };
};

const countActiveEmployees = async (workspaceIds = null) => {
  const scope = scopeClause(workspaceIds);
  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM employees${scope.where}${scope.where ? " AND" : " WHERE"} status <> 'Inactive'`,
    scope.params
  );
  return total;
};

const findRecentEmployees = async (limit, workspaceIds = null) => {
  const scope = scopeClause(workspaceIds);
  const [rows] = await pool.query(
    `SELECT employee_id, CONCAT(first_name, ' ', last_name) AS full_name, designation, department,
            DATE_FORMAT(joining_date, '%Y-%m-%d') AS joining_date, status
     FROM employees${scope.where} ORDER BY joining_date DESC, employee_id DESC LIMIT ?`,
    [...scope.params, limit]
  );
  return rows;
};

module.exports = {
  findEmployeeDirectory,
  loadWorkspaceSnapshot,
  loadTracker,
  findEmployeeStats,
  countActiveEmployees,
  findRecentEmployees
};
