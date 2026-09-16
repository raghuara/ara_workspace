const pool = require("../config/database");

const insertMany = async (rows, connection = pool) => {
  if (rows.length === 0) return;
  await connection.query(
    `INSERT INTO notifications (employee_id, kind, title, body, workspace_id, task_id, actor_id) VALUES ?`,
    [rows.map((row) => [row.employeeId, row.kind, row.title, row.body ?? null, row.workspaceId ?? null, row.taskId ?? null, row.actorId ?? null])]
  );
};

const findForEmployee = async (employeeId, limit) => {
  const [rows] = await pool.query(
    `SELECT n.id, n.kind, n.title, n.body, n.workspace_id, n.task_id, n.actor_id, n.is_read,
            DATE_FORMAT(n.created_at, '%Y-%m-%dT%H:%i:%s') AS created_at,
            CONCAT(a.first_name, ' ', a.last_name) AS actor_name
     FROM notifications n
     LEFT JOIN employees a ON a.employee_id = n.actor_id
     WHERE n.employee_id = ?
     ORDER BY n.is_read, n.created_at DESC, n.id DESC
     LIMIT ?`,
    [employeeId, limit]
  );
  return rows;
};

const countUnread = async (employeeId) => {
  const [[{ total }]] = await pool.query(
    "SELECT COUNT(*) AS total FROM notifications WHERE employee_id = ? AND is_read = FALSE",
    [employeeId]
  );
  return total;
};

const markRead = async (employeeId, id) => {
  const [result] = await pool.query("UPDATE notifications SET is_read = TRUE WHERE id = ? AND employee_id = ?", [id, employeeId]);
  return result.affectedRows > 0;
};

const markAllRead = async (employeeId) => {
  await pool.query("UPDATE notifications SET is_read = TRUE WHERE employee_id = ? AND is_read = FALSE", [employeeId]);
};

const pruneOld = async (employeeId) => {
  await pool.query(
    `DELETE FROM notifications
     WHERE employee_id = ? AND is_read = TRUE AND created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)`,
    [employeeId]
  );
};

module.exports = {
  insertMany,
  findForEmployee,
  countUnread,
  markRead,
  markAllRead,
  pruneOld
};
