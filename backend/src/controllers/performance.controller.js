const performanceModel = require("../models/performance.model");
const employeeModel = require("../models/employee.model");
const workspaceModel = require("../models/workspace.model");
const { USER_TYPE } = require("../constants/workspace");
const { nextId } = require("../utils/ids");
const { withTransaction } = require("../utils/transaction");

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;
const STATUSES = ["Draft", "In Progress", "Pending Employee", "Completed"];
const GOAL_STATUSES = ["On Track", "At Risk", "Completed"];

const text = (value) => (typeof value === "string" ? value.trim() : "");
const textList = (value) => (Array.isArray(value) ? value.map(text).filter(Boolean).slice(0, 10) : []);
const parseJson = (value, fallback) => {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const badRequest = (res, errors) =>
  res.status(400).json({ message: "Please fix the highlighted fields.", code: "VALIDATION_ERROR", errors });
const notFound = (res) => res.status(404).json({ message: "That performance review could not be found.", code: "NOT_FOUND" });

const allowedWorkspaceIds = async (req) =>
  req.user.userTypeId === USER_TYPE.MASTER_ADMIN ? null : workspaceModel.findWorkspaceIdsForEmployee(req.user.employeeId);

const inScope = (allowed, workspaceId) => allowed === null || (Boolean(workspaceId) && allowed.includes(workspaceId));

const loadVisible = async (req, id) => {
  const review = await loadOne(id);
  if (!review) return null;
  return inScope(await allowedWorkspaceIds(req), review.workspaceId) ? review : null;
};

const mapReview = (row, goals = []) => ({
  id: row.id,
  employeeId: row.employee_id,
  workspaceId: row.workspace_id,
  employeeName: row.employee_name,
  department: row.department,
  designation: row.designation,
  reviewerId: row.reviewer_id,
  reviewerName: row.reviewer_name ?? "Unassigned",
  reviewPeriod: row.review_period,
  status: row.status,
  overallRating: row.overall_rating === null ? null : Number(row.overall_rating),
  goals: goals.map((goal) => ({ id: goal.id, title: goal.title, progress: goal.progress, status: goal.status })),
  strengths: parseJson(row.strengths, []),
  improvementAreas: parseJson(row.improvement_areas, []),
  managerComments: row.manager_comments ?? "",
  employeeComments: row.employee_comments ?? "",
  completedAt: row.completed_at,
  createdById: row.created_by_id,
  createdOn: row.created_on,
  updatedOn: row.updated_on
});

const withGoals = async (rows) => {
  const goals = await performanceModel.findGoalsByReviewIds(rows.map((row) => row.id));
  return rows.map((row) => mapReview(row, goals.get(row.id) ?? []));
};

const loadOne = async (id) => {
  const row = await performanceModel.findReviewById(id);
  if (!row) return null;
  const [review] = await withGoals([row]);
  return review;
};

const validateReview = async (body, existing = null, allowed = null) => {
  const errors = {};
  const findVisibleEmployee = async (employeeId) => {
    const employee = await employeeModel.findEmployeeById(employeeId);
    return employee && inScope(allowed, employee.workspace_id) ? employee : null;
  };
  const has = (field) => body[field] !== undefined;
  const pick = (field, fallback) => (has(field) ? body[field] : fallback);

  const data = {
    employeeId: existing ? existing.employeeId : text(body.employeeId),
    reviewerId: text(pick("reviewerId", existing?.reviewerId ?? "")) || null,
    reviewPeriod: text(pick("reviewPeriod", existing?.reviewPeriod ?? "")).slice(0, 40),
    status: text(pick("status", existing?.status ?? "Draft")) || "Draft",
    overallRating: pick("overallRating", existing?.overallRating ?? null),
    strengths: has("strengths") ? textList(body.strengths) : (existing?.strengths ?? []),
    improvementAreas: has("improvementAreas") ? textList(body.improvementAreas) : (existing?.improvementAreas ?? []),
    managerComments: text(pick("managerComments", existing?.managerComments ?? "")) || null,
    employeeComments: text(pick("employeeComments", existing?.employeeComments ?? "")) || null,
    goals: has("goals")
      ? (Array.isArray(body.goals) ? body.goals : [])
          .map((goal) => ({
            title: text(goal?.title).slice(0, 200),
            progress: Math.min(100, Math.max(0, Number.parseInt(goal?.progress, 10) || 0)),
            status: GOAL_STATUSES.includes(goal?.status) ? goal.status : "On Track"
          }))
          .filter((goal) => goal.title)
          .slice(0, 12)
      : (existing?.goals ?? []).map(({ title, progress, status }) => ({ title, progress, status }))
  };

  if (!existing) {
    if (!data.employeeId) errors.employeeId = "Choose an employee.";
    else if (!(await findVisibleEmployee(data.employeeId))) errors.employeeId = "That employee does not exist.";
  }
  if (data.reviewerId && !(await findVisibleEmployee(data.reviewerId))) errors.reviewerId = "That reviewer does not exist.";
  if (data.reviewerId && data.reviewerId === data.employeeId) errors.reviewerId = "An employee cannot review themselves.";
  if (!data.reviewPeriod) errors.reviewPeriod = "Review period is required.";
  if (!STATUSES.includes(data.status)) errors.status = "Unknown status.";

  if (data.overallRating !== null && data.overallRating !== "") {
    const rating = Number(data.overallRating);
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) errors.overallRating = "Rating must be between 1 and 5.";
    else data.overallRating = Math.round(rating * 10) / 10;
  } else {
    data.overallRating = null;
  }

  if (data.status === "Completed" && data.overallRating === null) errors.overallRating = "A completed review needs an overall rating.";

  data.completedAt =
    data.status === "Completed" ? (existing?.completedAt ?? new Date().toISOString().slice(0, 10)) : null;

  return { errors, data };
};

const filtersFrom = (query) => ({
  search: text(query.search),
  status: STATUSES.includes(query.status) ? query.status : "",
  department: text(query.department),
  reviewPeriod: text(query.reviewPeriod),
  employeeId: text(query.employeeId)
});

const listReviews = async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(req.query.pageSize, 10) || DEFAULT_PAGE_SIZE));
  const { rows, total } = await performanceModel.findReviews({
    filters: { ...filtersFrom(req.query), workspaceIds: await allowedWorkspaceIds(req) },
    page,
    pageSize
  });
  res.json({ items: await withGoals(rows), total, page, pageSize });
};

const listByEmployee = async (req, res) => {
  const { rows } = await performanceModel.findReviews({
    filters: { employeeId: req.params.employeeId, workspaceIds: await allowedWorkspaceIds(req) },
    page: 1,
    pageSize: MAX_PAGE_SIZE
  });
  res.json(await withGoals(rows));
};

const listPending = async (req, res) => {
  const limit = Math.min(20, Math.max(1, parseInt(req.query.limit, 10) || 5));
  const { rows, total } = await performanceModel.findReviews({
    filters: { pendingOnly: true, workspaceIds: await allowedWorkspaceIds(req) },
    page: 1,
    pageSize: limit
  });
  res.json({ total, items: await withGoals(rows) });
};

const listPeriods = async (req, res) => {
  res.json(await performanceModel.findPeriods(await allowedWorkspaceIds(req)));
};

const getReview = async (req, res) => {
  const review = await loadVisible(req, req.params.id);
  if (!review) return notFound(res);
  res.json(review);
};

const createReview = async (req, res) => {
  const { errors, data } = await validateReview(req.body, null, await allowedWorkspaceIds(req));
  if (Object.keys(errors).length > 0) return badRequest(res, errors);

  const id = await withTransaction(async (connection) => {
    const reviewId = await nextId("PRV", connection);
    await performanceModel.insertReview({ ...data, id: reviewId, createdById: req.user.employeeId }, connection);
    await performanceModel.replaceGoals(reviewId, data.goals, connection);
    return reviewId;
  });

  res.status(201).json(await loadOne(id));
};

const updateReview = async (req, res) => {
  const existing = await loadVisible(req, req.params.id);
  if (!existing) return notFound(res);

  const { errors, data } = await validateReview(req.body, existing, await allowedWorkspaceIds(req));
  if (Object.keys(errors).length > 0) return badRequest(res, errors);

  await withTransaction(async (connection) => {
    await performanceModel.updateReview(existing.id, data, connection);
    await performanceModel.replaceGoals(existing.id, data.goals, connection);
  });

  res.json(await loadOne(existing.id));
};

const deleteReview = async (req, res) => {
  const existing = await loadVisible(req, req.params.id);
  if (!existing) return notFound(res);
  await performanceModel.deleteReview(existing.id);
  res.json({ id: existing.id });
};

module.exports = {
  listReviews,
  listByEmployee,
  listPending,
  listPeriods,
  getReview,
  createReview,
  updateReview,
  deleteReview
};
