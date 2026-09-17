const pool = require("../config/database");

const REVIEW_SELECT = `
  SELECT
    r.id,
    r.employee_id,
    CONCAT(e.first_name, ' ', e.last_name) AS employee_name,
    e.department,
    e.designation,
    r.reviewer_id,
    CONCAT(rv.first_name, ' ', rv.last_name) AS reviewer_name,
    r.review_period,
    r.status,
    r.overall_rating,
    r.strengths,
    r.improvement_areas,
    r.manager_comments,
    r.employee_comments,
    DATE_FORMAT(r.completed_at, '%Y-%m-%d') AS completed_at,
    r.created_by_id,
    e.workspace_id,
    DATE_FORMAT(r.created_at, '%Y-%m-%d') AS created_on,
    DATE_FORMAT(r.updated_at, '%Y-%m-%d') AS updated_on
  FROM performance_reviews r
  JOIN employees e ON e.employee_id = r.employee_id
  LEFT JOIN employees rv ON rv.employee_id = r.reviewer_id
`;

const buildFilters = ({ search, status, department, reviewPeriod, employeeId, pendingOnly, workspaceIds }) => {
  const clauses = [];
  const params = [];

  if (Array.isArray(workspaceIds)) {
    if (workspaceIds.length === 0) clauses.push("1 = 0");
    else {
      clauses.push("e.workspace_id IN (?)");
      params.push(workspaceIds);
    }
  }

  if (search) {
    const term = `%${search}%`;
    clauses.push("(CONCAT(e.first_name, ' ', e.last_name) LIKE ? OR CONCAT(rv.first_name, ' ', rv.last_name) LIKE ? OR e.designation LIKE ?)");
    params.push(term, term, term);
  }
  if (status) {
    clauses.push("r.status = ?");
    params.push(status);
  }
  if (department) {
    clauses.push("e.department = ?");
    params.push(department);
  }
  if (reviewPeriod) {
    clauses.push("r.review_period = ?");
    params.push(reviewPeriod);
  }
  if (employeeId) {
    clauses.push("r.employee_id = ?");
    params.push(employeeId);
  }
  if (pendingOnly) clauses.push("r.status <> 'Completed'");

  return { where: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "", params };
};

const findReviews = async ({ filters, page, pageSize }) => {
  const { where, params } = buildFilters(filters);
  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM performance_reviews r
     JOIN employees e ON e.employee_id = r.employee_id
     LEFT JOIN employees rv ON rv.employee_id = r.reviewer_id ${where}`,
    params
  );
  const [rows] = await pool.query(`${REVIEW_SELECT} ${where} ORDER BY r.updated_at DESC, r.id DESC LIMIT ? OFFSET ?`, [
    ...params,
    pageSize,
    (page - 1) * pageSize
  ]);
  return { rows, total };
};

const findReviewById = async (id, connection = pool) => {
  const [rows] = await connection.query(`${REVIEW_SELECT} WHERE r.id = ? LIMIT 1`, [id]);
  return rows[0] || null;
};

const findGoalsByReviewIds = async (reviewIds) => {
  if (reviewIds.length === 0) return new Map();
  const [rows] = await pool.query(
    "SELECT id, review_id, title, progress, status FROM performance_goals WHERE review_id IN (?) ORDER BY review_id, sort_order, id",
    [reviewIds]
  );
  const map = new Map();
  rows.forEach((row) => {
    if (!map.has(row.review_id)) map.set(row.review_id, []);
    map.get(row.review_id).push(row);
  });
  return map;
};

const findPeriods = async (workspaceIds = null) => {
  const { where, params } = buildFilters({ workspaceIds });
  const [rows] = await pool.query(
    `SELECT DISTINCT r.review_period FROM performance_reviews r
     JOIN employees e ON e.employee_id = r.employee_id ${where}
     ORDER BY r.review_period DESC`,
    params
  );
  return rows.map((row) => row.review_period);
};

const insertReview = async (review, connection) => {
  await connection.query(
    `INSERT INTO performance_reviews
       (id, employee_id, reviewer_id, review_period, status, overall_rating, strengths, improvement_areas,
        manager_comments, employee_comments, completed_at, created_by_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      review.id,
      review.employeeId,
      review.reviewerId,
      review.reviewPeriod,
      review.status,
      review.overallRating,
      JSON.stringify(review.strengths),
      JSON.stringify(review.improvementAreas),
      review.managerComments,
      review.employeeComments,
      review.completedAt,
      review.createdById
    ]
  );
};

const updateReview = async (id, review, connection) => {
  await connection.query(
    `UPDATE performance_reviews
     SET reviewer_id = ?, review_period = ?, status = ?, overall_rating = ?, strengths = ?, improvement_areas = ?,
         manager_comments = ?, employee_comments = ?, completed_at = ?
     WHERE id = ?`,
    [
      review.reviewerId,
      review.reviewPeriod,
      review.status,
      review.overallRating,
      JSON.stringify(review.strengths),
      JSON.stringify(review.improvementAreas),
      review.managerComments,
      review.employeeComments,
      review.completedAt,
      id
    ]
  );
};

const replaceGoals = async (reviewId, goals, connection) => {
  await connection.query("DELETE FROM performance_goals WHERE review_id = ?", [reviewId]);
  if (goals.length > 0) {
    await connection.query("INSERT INTO performance_goals (review_id, title, progress, status, sort_order) VALUES ?", [
      goals.map((goal, index) => [reviewId, goal.title, goal.progress, goal.status, index])
    ]);
  }
};

const deleteReview = async (id) => {
  await pool.query("DELETE FROM performance_reviews WHERE id = ?", [id]);
};

module.exports = {
  findReviews,
  findReviewById,
  findGoalsByReviewIds,
  findPeriods,
  insertReview,
  updateReview,
  replaceGoals,
  deleteReview
};
