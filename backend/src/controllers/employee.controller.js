const employeeModel = require("../models/employee.model");
const departmentModel = require("../models/department.model");
const { EMPLOYMENT_STATUSES, EMPLOYMENT_TYPES, WORK_LOCATIONS } = require("../constants/employee");

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const text = (value) => (typeof value === "string" ? value.trim() : "");

const isValidDate = (value) => DATE_PATTERN.test(value) && !Number.isNaN(Date.parse(value));

const mapEmployee = (row) => ({
  id: row.employee_id,
  employeeId: row.employee_id,
  firstName: row.first_name,
  lastName: row.last_name,
  fullName: `${row.first_name} ${row.last_name}`,
  email: row.email,
  phone: row.phone,
  department: row.department,
  designation: row.designation,
  joiningDate: row.joining_date,
  status: row.status,
  employmentType: row.employment_type,
  workLocation: row.work_location,
  reportingManagerId: row.reporting_manager_id,
  reportingManager: row.reporting_manager || null,
  avatarUrl: null
});

const validateEmployee = async (body = {}) => {
  const errors = {};

  const data = {
    firstName: text(body.firstName),
    lastName: text(body.lastName),
    email: text(body.email).toLowerCase(),
    phone: text(body.phone) || null,
    department: text(body.department),
    designation: text(body.designation),
    joiningDate: text(body.joiningDate),
    status: text(body.status) || "Active",
    employmentType: text(body.employmentType) || "Full-time",
    workLocation: text(body.workLocation) || "Colombo HQ",
    reportingManagerId: text(body.reportingManagerId) || null
  };

  if (!data.firstName) errors.firstName = "First name is required.";
  if (!data.lastName) errors.lastName = "Last name is required.";

  if (!data.email) errors.email = "Email is required.";
  else if (!EMAIL_PATTERN.test(data.email)) errors.email = "Enter a valid email address.";

  if (!data.designation) errors.designation = "Designation is required.";

  if (!data.department) errors.department = "Department is required.";
  else if (!(await departmentModel.findActiveDepartmentByName(data.department))) {
    errors.department = "Unknown or inactive department.";
  }

  if (!data.joiningDate) errors.joiningDate = "Joining date is required.";
  else if (!isValidDate(data.joiningDate)) errors.joiningDate = "Joining date must be YYYY-MM-DD.";

  if (!EMPLOYMENT_STATUSES.includes(data.status)) errors.status = "Unknown status.";
  if (!EMPLOYMENT_TYPES.includes(data.employmentType)) errors.employmentType = "Unknown employment type.";
  if (!WORK_LOCATIONS.includes(data.workLocation)) errors.workLocation = "Unknown work location.";

  return { errors, data };
};

const validationFailed = (res, errors) =>
  res.status(400).json({
    message: "Please fix the highlighted fields.",
    code: "VALIDATION_ERROR",
    errors
  });

const notFound = (res) =>
  res.status(404).json({
    message: "That employee record does not exist.",
    code: "NOT_FOUND"
  });

const duplicateEmail = (res) =>
  res.status(409).json({
    message: "An employee with this email already exists.",
    code: "DUPLICATE_EMAIL",
    errors: { email: "This email is already in use." }
  });

const getAllEmployees = async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, parseInt(req.query.pageSize, 10) || DEFAULT_PAGE_SIZE)
  );

  const { rows, total } = await employeeModel.findAllEmployees({
    search: req.query.search || "",
    department: req.query.department || "",
    status: req.query.status || "",
    page,
    pageSize
  });

  res.json({
    items: rows.map(mapEmployee),
    total,
    page,
    pageSize
  });
};

const getEmployeeById = async (req, res) => {
  const employee = await employeeModel.findEmployeeById(req.params.employeeId);
  if (!employee) return notFound(res);

  res.json(mapEmployee(employee));
};

const getDirectReports = async (req, res) => {
  const rows = await employeeModel.findDirectReports(req.params.employeeId);

  res.json(
    rows.map((row) => ({
      id: row.employee_id,
      fullName: `${row.first_name} ${row.last_name}`,
      designation: row.designation,
      status: row.status
    }))
  );
};

const createEmployee = async (req, res) => {
  const { errors, data } = await validateEmployee(req.body);

  if (data.reportingManagerId) {
    const manager = await employeeModel.findEmployeeById(data.reportingManagerId);
    if (!manager) errors.reportingManagerId = "Reporting manager not found.";
  }

  if (Object.keys(errors).length > 0) return validationFailed(res, errors);

  try {
    const employeeId = await employeeModel.nextEmployeeId();
    const created = await employeeModel.createEmployee({ ...data, employeeId });
    return res.status(201).json(mapEmployee(created));
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") return duplicateEmail(res);
    throw error;
  }
};

const updateEmployee = async (req, res) => {
  const { employeeId } = req.params;
  const existing = await employeeModel.findEmployeeById(employeeId);
  if (!existing) return notFound(res);

  const { errors, data } = await validateEmployee(req.body);

  if (data.reportingManagerId === employeeId) {
    errors.reportingManagerId = "An employee cannot report to themselves.";
  } else if (data.reportingManagerId) {
    const manager = await employeeModel.findEmployeeById(data.reportingManagerId);
    if (!manager) errors.reportingManagerId = "Reporting manager not found.";
  }

  if (Object.keys(errors).length > 0) return validationFailed(res, errors);

  try {
    const updated = await employeeModel.updateEmployee(employeeId, data);
    return res.json(mapEmployee(updated));
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") return duplicateEmail(res);
    throw error;
  }
};

module.exports = {
  getAllEmployees,
  getEmployeeById,
  getDirectReports,
  createEmployee,
  updateEmployee
};
