const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const accountModel = require("../models/account.model");
const workspaceModel = require("../models/workspace.model");
const access = require("../services/access.service");
const { USER_TYPE } = require("../constants/workspace");

const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
const PASSWORD_RULE = "Password must be at least 8 characters and include a letter and a number.";

const text = (value) => (typeof value === "string" ? value.trim() : "");

const badRequest = (res, message, errors) =>
  res.status(400).json({ message, code: errors ? "VALIDATION_ERROR" : "BAD_REQUEST", ...(errors && { errors }) });
const notFound = (res, message) => res.status(404).json({ message, code: "NOT_FOUND" });
const forbidden = (res, message = "You do not have access to this workspace.") =>
  res.status(403).json({ message, code: "FORBIDDEN" });

const generatePassword = () => {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = crypto.randomBytes(10);
  let out = "";
  for (const byte of bytes) out += alphabet[byte % alphabet.length];
  return `${out.slice(0, 5)}-${out.slice(5)}`;
};

const mapAccount = (row) => ({
  employeeId: row.employee_id,
  workspaceId: row.workspace_id,
  workspaceName: row.workspace_name,
  fullName: row.full_name,
  email: row.login_email ?? row.work_email,
  department: row.department,
  designation: row.designation,
  employmentStatus: row.employment_status,
  hasAccount: row.user_id !== null,
  userId: row.user_id,
  userTypeId: row.user_type_id,
  userTypeName: row.user_type_name,
  isActive: row.user_id === null ? null : Boolean(row.is_active),
  mustChangePassword: Boolean(row.must_change_password),
  lastLoginAt: row.last_login_at,
  accountCreatedAt: row.account_created_at
});

const mapUserTypeOption = (row) => ({ id: row.id, name: row.name, slug: row.slug, tone: row.tone });

const loadVisibleAccount = async (req, employeeId) => {
  const account = employeeId ? await accountModel.findAccountByEmployeeId(employeeId) : null;
  if (!account) return null;
  return access.inScope(await access.allowedWorkspaceIds(req), account.workspace_id) ? account : null;
};

const assignableTypes = async (req) => access.assignableUserTypes(req, await accountModel.findUserTypes());

const canManageAccount = (req, account, assignable) =>
  access.isMasterAdmin(req) ||
  account.user_id === null ||
  assignable.some((userType) => userType.id === account.user_type_id);

const listAccounts = async (req, res) => {
  const workspaceId = text(req.query.workspaceId);
  const allowed = await access.allowedWorkspaceIds(req);

  if (workspaceId) {
    if (!(await workspaceModel.findWorkspaceById(workspaceId))) return notFound(res, "That workspace does not exist.");
    if (!access.inScope(allowed, workspaceId)) return forbidden(res);
  }

  const rows = await accountModel.findAccounts({
    search: text(req.query.search),
    workspaceId,
    workspaceIds: workspaceId ? null : allowed,
    includeUnassigned: allowed === null
  });
  const assignable = await assignableTypes(req);
  res.json(rows.map((row) => ({ ...mapAccount(row), canManage: canManageAccount(req, row, assignable) })));
};

const listUserTypeOptions = async (req, res) => {
  res.json((await assignableTypes(req)).map(mapUserTypeOption));
};

const getAccount = async (req, res) => {
  const account = await loadVisibleAccount(req, req.params.employeeId);
  if (!account) return notFound(res, "That employee could not be found.");
  const assignable = await assignableTypes(req);
  res.json({ ...mapAccount(account), canManage: canManageAccount(req, account, assignable) });
};

const createAccount = async (req, res) => {
  const employeeId = text(req.body.employeeId);
  const userTypeId = Number.parseInt(req.body.userTypeId, 10);
  const password = text(req.body.password);
  const errors = {};

  const employee = await loadVisibleAccount(req, employeeId);
  if (!employee) errors.employeeId = "Choose an employee.";
  else if (employee.user_id !== null) errors.employeeId = "This employee already has a login.";
  else if (!employee.work_email) errors.employeeId = "This employee has no work email.";

  const assignable = await assignableTypes(req);
  if (!Number.isInteger(userTypeId) || !assignable.some((userType) => userType.id === userTypeId)) {
    errors.userTypeId = "Choose a user type you are allowed to grant.";
  }
  if (password && !PASSWORD_PATTERN.test(password)) errors.password = PASSWORD_RULE;

  if (Object.keys(errors).length > 0) return badRequest(res, "Please fix the highlighted fields.", errors);

  const temporaryPassword = password || generatePassword();
  await accountModel.insertAccount({
    employeeId,
    email: employee.work_email.toLowerCase(),
    passwordHash: await bcrypt.hash(temporaryPassword, 10),
    userTypeId
  });

  res.status(201).json({
    account: { ...mapAccount(await accountModel.findAccountByEmployeeId(employeeId)), canManage: true },
    temporaryPassword
  });
};

const updateAccount = async (req, res) => {
  const account = await loadVisibleAccount(req, req.params.employeeId);
  if (!account || account.user_id === null) return notFound(res, "That login does not exist.");

  const assignable = await assignableTypes(req);
  if (!canManageAccount(req, account, assignable)) {
    return forbidden(res, "This login has more access than you can manage.");
  }

  const userTypeId = req.body.userTypeId === undefined ? account.user_type_id : Number.parseInt(req.body.userTypeId, 10);
  const isActive = req.body.isActive === undefined ? Boolean(account.is_active) : Boolean(req.body.isActive);

  if (!Number.isInteger(userTypeId) || !assignable.some((userType) => userType.id === userTypeId)) {
    return badRequest(res, "Choose a user type you are allowed to grant.", { userTypeId: "Unknown user type." });
  }

  const isSelf = account.user_id === req.user.userId;
  if (isSelf && !isActive) return badRequest(res, "You cannot deactivate your own login.");
  if (isSelf && userTypeId !== account.user_type_id) return badRequest(res, "You cannot change your own user type.");

  const losesMasterAdmin =
    account.user_type_id === USER_TYPE.MASTER_ADMIN && (userTypeId !== USER_TYPE.MASTER_ADMIN || !isActive);
  if (losesMasterAdmin && (await accountModel.countActiveUsersOfType(USER_TYPE.MASTER_ADMIN, account.user_id)) === 0) {
    return badRequest(res, "At least one active Master Admin login must remain.");
  }

  await accountModel.updateAccount(account.user_id, { userTypeId, isActive });
  res.json({ ...mapAccount(await accountModel.findAccountByEmployeeId(account.employee_id)), canManage: true });
};

const resetPassword = async (req, res) => {
  const account = await loadVisibleAccount(req, req.params.employeeId);
  if (!account || account.user_id === null) return notFound(res, "That login does not exist.");
  if (account.user_id === req.user.userId) {
    return badRequest(res, "Use Change password from your profile menu to change your own password.");
  }
  if (!canManageAccount(req, account, await assignableTypes(req))) {
    return forbidden(res, "This login has more access than you can manage.");
  }

  const password = text(req.body.password);
  if (password && !PASSWORD_PATTERN.test(password)) return badRequest(res, PASSWORD_RULE, { password: PASSWORD_RULE });

  const temporaryPassword = password || generatePassword();
  await accountModel.setPassword(account.user_id, await bcrypt.hash(temporaryPassword, 10), true);

  res.json({
    account: { ...mapAccount(await accountModel.findAccountByEmployeeId(account.employee_id)), canManage: true },
    temporaryPassword
  });
};

module.exports = {
  listAccounts,
  listUserTypeOptions,
  getAccount,
  createAccount,
  updateAccount,
  resetPassword,
  generatePassword,
  PASSWORD_PATTERN,
  PASSWORD_RULE
};
