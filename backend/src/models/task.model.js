const pool = require("../config/database");

const TASK_SELECT = `
  SELECT
    t.id,
    t.workspace_id,
    t.group_id,
    t.team_id,
    t.client_id,
    t.status_id,
    t.title,
    t.description,
    t.priority,
    t.size_key,
    t.points,
    t.tags,
    t.created_by_id,
    DATE_FORMAT(t.created_at, '%Y-%m-%d') AS created_at,
    DATE_FORMAT(t.due_date, '%Y-%m-%d') AS due_date,
    DATE_FORMAT(t.scheduled_date, '%Y-%m-%d') AS scheduled_date,
    DATE_FORMAT(t.completed_at, '%Y-%m-%d') AS completed_at,
    t.completed_by_id,
    t.comment_count,
    sc.name AS status_name,
    sc.kind AS status_kind,
    sc.tone AS status_tone,
    cl.name AS client_name,
    cl.tone AS client_tone,
    g.name AS group_name,
    g.tone AS group_tone,
    tm.name AS team_name,
    (sc.kind <> 'completed' AND t.due_date IS NOT NULL AND t.due_date < CURDATE()) AS is_overdue,
    (SELECT COUNT(*) FROM attachments a WHERE a.owner_type = 'task' AND a.owner_id = t.id) AS attachment_count
  FROM tasks t
  JOIN status_columns sc ON sc.id = t.status_id
  LEFT JOIN clients cl ON cl.id = t.client_id
  LEFT JOIN workspace_groups g ON g.id = t.group_id
  LEFT JOIN teams tm ON tm.id = t.team_id
`;

const buildFilters = ({ workspaceId, visibility, filters }) => {
  const clauses = ["t.workspace_id = ?"];
  const params = [workspaceId];

  if (visibility) {
    const reach = ["EXISTS (SELECT 1 FROM task_assignees ta WHERE ta.task_id = t.id AND ta.employee_id = ?)"];
    params.push(visibility.employeeId);
    if (visibility.groupIds.length > 0) {
      reach.push("t.group_id IN (?)");
      params.push(visibility.groupIds);
    }
    if (visibility.teamIds.length > 0) {
      reach.push("t.team_id IN (?)");
      params.push(visibility.teamIds);
    }
    clauses.push(`(${reach.join(" OR ")})`);
  }

  if (filters.search) {
    const term = `%${filters.search}%`;
    clauses.push("(t.title LIKE ? OR t.description LIKE ?)");
    params.push(term, term);
  }

  const equals = { clientId: "t.client_id", groupId: "t.group_id", teamId: "t.team_id", priority: "t.priority", sizeKey: "t.size_key" };
  Object.entries(equals).forEach(([key, column]) => {
    if (filters[key]) {
      clauses.push(`${column} = ?`);
      params.push(filters[key]);
    }
  });

  if (filters.assigneeId) {
    clauses.push("EXISTS (SELECT 1 FROM task_assignees ta WHERE ta.task_id = t.id AND ta.employee_id = ?)");
    params.push(filters.assigneeId);
  }

  if (filters.tab === "today") {
    clauses.push("sc.kind <> 'completed' AND (t.due_date = CURDATE() OR t.scheduled_date = CURDATE())");
  } else if (filters.tab === "scheduled") {
    clauses.push("t.scheduled_date IS NOT NULL AND t.scheduled_date > CURDATE()");
  } else if (filters.tab === "overdue") {
    clauses.push("sc.kind <> 'completed' AND t.due_date IS NOT NULL AND t.due_date < CURDATE()");
  }

  return { where: `WHERE ${clauses.join(" AND ")}`, params };
};

const findTasks = async ({ workspaceId, visibility, filters }) => {
  const { where, params } = buildFilters({ workspaceId, visibility, filters });
  const [rows] = await pool.query(`${TASK_SELECT} ${where} ORDER BY t.due_date IS NULL, t.due_date, t.id`, params);
  return rows;
};

const findTaskById = async (taskId, connection = pool) => {
  const [rows] = await connection.query(`${TASK_SELECT} WHERE t.id = ? LIMIT 1`, [taskId]);
  return rows[0] || null;
};

const findAssigneesByTaskIds = async (taskIds) => {
  if (taskIds.length === 0) return new Map();
  const [rows] = await pool.query(
    `SELECT ta.task_id, ta.employee_id, CONCAT(e.first_name, ' ', e.last_name) AS full_name
     FROM task_assignees ta
     JOIN employees e ON e.employee_id = ta.employee_id
     WHERE ta.task_id IN (?)
     ORDER BY e.first_name, e.last_name`,
    [taskIds]
  );
  const map = new Map();
  rows.forEach((row) => {
    if (!map.has(row.task_id)) map.set(row.task_id, []);
    map.get(row.task_id).push({ id: row.employee_id, fullName: row.full_name });
  });
  return map;
};

const findTeamIdsForEmployee = async (employeeId) => {
  const [rows] = await pool.query(
    `SELECT t.id FROM teams t
     WHERE t.lead_id = ?
        OR EXISTS (SELECT 1 FROM team_members tm WHERE tm.team_id = t.id AND tm.employee_id = ?)`,
    [employeeId, employeeId]
  );
  return rows.map((row) => row.id);
};

const insertTask = async (task, connection) => {
  await connection.query(
    `INSERT INTO tasks
       (id, workspace_id, group_id, team_id, client_id, status_id, title, description, priority,
        size_key, points, tags, created_by_id, created_at, due_date, scheduled_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), ?, ?)`,
    [
      task.id,
      task.workspaceId,
      task.groupId,
      task.teamId,
      task.clientId,
      task.statusId,
      task.title,
      task.description,
      task.priority,
      task.sizeKey,
      task.points,
      JSON.stringify(task.tags),
      task.createdById,
      task.dueDate,
      task.scheduledDate
    ]
  );
};

const COLUMN_FOR_FIELD = {
  groupId: "group_id",
  teamId: "team_id",
  clientId: "client_id",
  statusId: "status_id",
  title: "title",
  description: "description",
  priority: "priority",
  sizeKey: "size_key",
  points: "points",
  tags: "tags",
  dueDate: "due_date",
  scheduledDate: "scheduled_date",
  completedAt: "completed_at",
  completedById: "completed_by_id"
};

const updateTask = async (taskId, changes, connection = pool) => {
  const entries = Object.entries(changes).filter(([field]) => COLUMN_FOR_FIELD[field]);
  if (entries.length === 0) return;

  const assignments = entries.map(([field]) => `${COLUMN_FOR_FIELD[field]} = ?`);
  const values = entries.map(([field, value]) => (field === "tags" ? JSON.stringify(value) : value));

  await connection.query(`UPDATE tasks SET ${assignments.join(", ")} WHERE id = ?`, [...values, taskId]);
};

const replaceAssignees = async (taskId, employeeIds, connection = pool) => {
  await connection.query("DELETE FROM task_assignees WHERE task_id = ?", [taskId]);
  if (employeeIds.length > 0) {
    await connection.query("INSERT INTO task_assignees (task_id, employee_id) VALUES ?", [
      employeeIds.map((employeeId) => [taskId, employeeId])
    ]);
  }
};

const deleteTask = async (taskId, connection = pool) => {
  await connection.query("DELETE FROM tasks WHERE id = ?", [taskId]);
};

const insertHistory = async (entry, connection = pool) => {
  await connection.query(
    `INSERT INTO task_history (task_id, workspace_id, actor_id, action, summary, detail)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [entry.taskId, entry.workspaceId, entry.actorId, entry.action, entry.summary, entry.detail ? JSON.stringify(entry.detail) : null]
  );
};

const findHistory = async (taskId) => {
  const [rows] = await pool.query(
    `SELECT h.id, h.task_id, h.workspace_id, h.actor_id, h.action, h.summary, h.detail,
            DATE_FORMAT(h.at, '%Y-%m-%dT%H:%i:%s') AS at,
            CONCAT(e.first_name, ' ', e.last_name) AS actor_name
     FROM task_history h
     LEFT JOIN employees e ON e.employee_id = h.actor_id
     WHERE h.task_id = ?
     ORDER BY h.at DESC, h.id DESC`,
    [taskId]
  );
  return rows;
};

const findAutomationRules = async () => {
  const [rows] = await pool.query("SELECT id, enabled FROM automation_rules");
  return Object.fromEntries(rows.map((row) => [row.id, Boolean(row.enabled)]));
};

const findDueScheduledTasks = async (workspaceId) => {
  const [rows] = await pool.query(
    `SELECT t.id, sc.name AS from_name
     FROM tasks t
     JOIN status_columns sc ON sc.id = t.status_id
     WHERE t.workspace_id = ? AND sc.kind = 'scheduled'
       AND t.scheduled_date IS NOT NULL AND t.scheduled_date <= CURDATE()`,
    [workspaceId]
  );
  return rows;
};

const moveTasksToColumn = async (taskIds, columnId) => {
  if (taskIds.length === 0) return;
  await pool.query("UPDATE tasks SET status_id = ? WHERE id IN (?)", [columnId, taskIds]);
};

const existsInWorkspace = async (table, id, workspaceId) => {
  const [[{ found }]] = await pool.query(
    `SELECT EXISTS (SELECT 1 FROM ${table} WHERE id = ? AND workspace_id = ?) AS found`,
    [id, workspaceId]
  );
  return Boolean(found);
};

const teamBelongsToWorkspace = async (teamId, workspaceId) => {
  const [[{ found }]] = await pool.query(
    `SELECT EXISTS (
       SELECT 1 FROM teams t JOIN workspace_groups g ON g.id = t.group_id
       WHERE t.id = ? AND g.workspace_id = ?
     ) AS found`,
    [teamId, workspaceId]
  );
  return Boolean(found);
};

module.exports = {
  findTasks,
  findTaskById,
  findAssigneesByTaskIds,
  findTeamIdsForEmployee,
  insertTask,
  updateTask,
  replaceAssignees,
  deleteTask,
  insertHistory,
  findHistory,
  findAutomationRules,
  findDueScheduledTasks,
  moveTasksToColumn,
  existsInWorkspace,
  teamBelongsToWorkspace
};
