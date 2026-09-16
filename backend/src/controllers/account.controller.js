const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const accountModel = require("../models/account.model");
const { USER_TYPE } = require("../constants/workspace");

const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
const PASSWORD_RULE = "Password must be at least 8 characters and include a letter and a number.";

const text = (value) => (typeof value === "string" ? value.trim() : "");

const badRequest = (res, message, errors) =>
  res.status(400).json({ message, code: errors ? "VALIDATION_ERROR" : "BAD_REQUEST", ...(errors && { errors }) });
const notFound = (res, message) => res.status(404).json({ message, code: "NOT_FOUND" });

const generatePassword = () => {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = crypto.randomBytes(10);
  let out = "";
  for (const byte of bytes) out += alphabet[byte % alphabet.length];
  return `${out.slice(0, 5)}-${out.slice(5)}`;
};

const mapAccount = (row) => ({
  employeeId: row.employee_id,
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

const listAccounts = async (req, res) => {
  const rows = await accountModel.findAccounts({ search: text(req.query.search) });
  res.json(rows.map(mapAccount));
};

const createAccount = async (req, res) => {
  const employeeId = text(req.body.employeeId);
  const userTypeId = Number.parseInt(req.body.userTypeId, 10);
  const password = text(req.body.password);
  const errors = {};

  const employee = employeeId ? await accountModel.findAccountByEmployeeId(employeeId) : null;
  if (!employee) errors.employeeId = "Choose an employee.";
  else if (employee.user_id !== null) errors.employeeId = "This employee already has a login.";
  else if (!employee.work_email) errors.employeeId = "This employee has no work email.";

  if (!Number.isInteger(userTypeId) || !(await accountModel.userTypeExists(userTypeId))) errors.userTypeId = "Choose a user type.";
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
    account: mapAccount(await accountModel.findAccountByEmployeeId(employeeId)),
    temporaryPassword
  });
};

const updateAccount = async (req, res) => {
  const account = await accountModel.findAccountByEmployeeId(req.params.employeeId);
  if (!account || account.user_id === null) return notFound(res, "That login does not exist.");

  const userTypeId = req.body.userTypeId === undefined ? account.user_type_id : Number.parseInt(req.body.userTypeId, 10);
  const isActive = req.body.isActive === undefined ? Boolean(account.is_active) : Boolean(req.body.isActive);

  if (!Number.isInteger(userTypeId) || !(await accountModel.userTypeExists(userTypeId))) {
    return badRequest(res, "Choose a user type.", { userTypeId: "Unknown user type." });
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
  res.json(mapAccount(await accountModel.findAccountByEmployeeId(account.employee_id)));
};

const resetPassword = async (req, res) => {
  const account = await accountModel.findAccountByEmployeeId(req.params.employeeId);
  if (!account || account.user_id === null) return notFound(res, "That login does not exist.");
  if (account.user_id === req.user.userId) {
    return badRequest(res, "Use Change password from your profile menu to change your own password.");
  }

  const password = text(req.body.password);
  if (password && !PASSWORD_PATTERN.test(password)) return badRequest(res, PASSWORD_RULE, { password: PASSWORD_RULE });

  const temporaryPassword = password || generatePassword();
  await accountModel.setPassword(account.user_id, await bcrypt.hash(temporaryPassword, 10), true);

  res.json({
    account: mapAccount(await accountModel.findAccountByEmployeeId(account.employee_id)),
    temporaryPassword
  });
};

module.exports = {
  listAccounts,
  createAccount,
  updateAccount,
  resetPassword,
  PASSWORD_PATTERN,
  PASSWORD_RULE
};
