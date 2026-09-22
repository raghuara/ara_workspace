const pool = require("../config/database");

const COMMENT_SELECT = `
  SELECT
    c.id,
    c.task_id,
    c.workspace_id,
    c.author_id,
    c.author_type_id,
    c.body,
    c.created_at,
    c.edited_at,
    CONCAT(e.first_name, ' ', e.last_name) AS author_name,
    ut.name AS author_type_name
  FROM task_comments c
  LEFT JOIN employees e ON e.employee_id = c.author_id
  LEFT JOIN user_types ut ON ut.id = c.author_type_id
`;

const findComments = async (taskId) => {
  const [rows] = await pool.query(`${COMMENT_SELECT} WHERE c.task_id = ? ORDER BY c.created_at, c.id`, [taskId]);
  return rows;
};

const findCommentById = async (commentId, connection = pool) => {
  const [rows] = await connection.query(`${COMMENT_SELECT} WHERE c.id = ? LIMIT 1`, [commentId]);
  return rows[0] ?? null;
};

const insertComment = async (comment, connection = pool) => {
  const [result] = await connection.query(
    `INSERT INTO task_comments (task_id, workspace_id, author_id, author_type_id, body, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [comment.taskId, comment.workspaceId, comment.authorId, comment.authorTypeId, comment.body, comment.createdAt]
  );
  await connection.query("UPDATE tasks SET comment_count = comment_count + 1 WHERE id = ?", [comment.taskId]);
  return result.insertId;
};

const updateComment = async (commentId, body, editedAt, connection = pool) => {
  await connection.query("UPDATE task_comments SET body = ?, edited_at = ? WHERE id = ?", [body, editedAt, commentId]);
};

const deleteComment = async (comment, connection = pool) => {
  await connection.query("DELETE FROM task_comments WHERE id = ?", [comment.id]);
  await connection.query("UPDATE tasks SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = ?", [comment.task_id]);
};

module.exports = {
  findComments,
  findCommentById,
  insertComment,
  updateComment,
  deleteComment
};
