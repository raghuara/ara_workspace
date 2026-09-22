const pool = require("../config/database");

const EMPLOYEE_SELECT = `
  SELECT
    e.id,
    e.employee_id,
    e.workspace_id,
    w.name AS workspace_name,
    e.first_name,
    e.last_name,
    e.email,
    e.phone,
    e.department,
    e.designation,
    DATE_FORMAT(e.joining_date, '%Y-%m-%d') AS joining_date,
    e.status,
    e.employment_type,
    e.work_location,
    e.reporting_manager_id,
    CONCAT(m.first_name, ' ', m.last_name) AS reporting_manager,
    (SELECT u.user_type_id FROM users u WHERE u.employee_id = e.employee_id LIMIT 1) AS login_user_type_id
  FROM employees e
  LEFT JOIN employees m ON m.employee_id = e.reporting_manager_id
  LEFT JOIN workspaces w ON w.id = e.workspace_id
`;

const buildFilters = ({ search, department, status, workspaceId, workspaceIds }) => {
  const clauses = [];
  const params = [];

  if (workspaceId) {
    clauses.push("e.workspace_id = ?");
    params.push(workspaceId);
  } else if (workspaceIds) {
    if (workspaceIds.length === 0) clauses.push("1 = 0");
    else {
      clauses.push("e.workspace_id IN (?)");
      params.push(workspaceIds);
    }
  }

  if (search) {
    const term = `%${search}%`;
    clauses.push(
      `(CONCAT(e.first_name, ' ', e.last_name) LIKE ?
        OR e.employee_id LIKE ?
        OR e.email LIKE ?
        OR e.designation LIKE ?)`
    );
    params.push(term, term, term, term);
  }

  if (department) {
    clauses.push("e.department = ?");
    params.push(department);
  }

  if (status) {
    clauses.push("e.status = ?");
    params.push(status);
  }

  return {
    where: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "",
    params
  };
};

const findAllEmployees = async ({ search, department, status, workspaceId, workspaceIds, page, pageSize }) => {
  const { where, params } = buildFilters({ search, department, status, workspaceId, workspaceIds });
  const offset = (page - 1) * pageSize;

  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM employees e ${where}`,
    params
  );

  const [rows] = await pool.query(
    `${EMPLOYEE_SELECT} ${where} ORDER BY e.employee_id LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );

  return { rows, total };
};

const findEmployeeById = async (employeeId) => {
  const [rows] = await pool.query(
    `${EMPLOYEE_SELECT} WHERE e.employee_id = ? LIMIT 1`,
    [employeeId]
  );
  return rows[0] || null;
};

const findDirectReports = async (managerId) => {
  const [rows] = await pool.query(
    `${EMPLOYEE_SELECT} WHERE e.reporting_manager_id = ? ORDER BY e.first_name, e.last_name`,
    [managerId]
  );
  return rows;
};

const nextEmployeeId = async () => {
  const [[{ max_num }]] = await pool.query(
    "SELECT MAX(CAST(SUBSTRING(employee_id, 5) AS UNSIGNED)) AS max_num FROM employees"
  );
  const next = (max_num || 0) + 1;
  return `EMP-${String(next).padStart(4, "0")}`;
};

const insertEmployee = async (employee, connection = pool) => {
  await connection.query(
    `INSERT INTO employees
       (employee_id, workspace_id, first_name, last_name, email, phone, department, designation,
        joining_date, status, employment_type, work_location, reporting_manager_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      employee.employeeId,
      employee.workspaceId,
      employee.firstName,
      employee.lastName,
      employee.email,
      employee.phone,
      employee.department,
      employee.designation,
      employee.joiningDate,
      employee.status,
      employee.employmentType,
      employee.workLocation,
      employee.reportingManagerId
    ]
  );
};

const createEmployee = async (employee) => {
  await insertEmployee(employee);
  return findEmployeeById(employee.employeeId);
};

const findByEmails = async (emails) => {
  if (emails.length === 0) return [];
  const [rows] = await pool.query("SELECT employee_id, email, workspace_id FROM employees WHERE email IN (?)", [emails]);
  return rows;
};

const maxEmployeeNumber = async (connection = pool) => {
  const [[{ max_num }]] = await connection.query(
    "SELECT MAX(CAST(SUBSTRING(employee_id, 5) AS UNSIGNED)) AS max_num FROM employees FOR UPDATE"
  );
  return max_num || 0;
};

const setReportingManager = async (employeeId, managerId, connection = pool) => {
  await connection.query("UPDATE employees SET reporting_manager_id = ? WHERE employee_id = ?", [managerId, employeeId]);
};

const updateEmployee = async (employeeId, employee) => {
  await pool.query(
    `UPDATE employees
     SET workspace_id = ?, first_name = ?, last_name = ?, email = ?, phone = ?, department = ?,
         designation = ?, joining_date = ?, status = ?, employment_type = ?,
         work_location = ?, reporting_manager_id = ?
     WHERE employee_id = ?`,
    [
      employee.workspaceId,
      employee.firstName,
      employee.lastName,
      employee.email,
      employee.phone,
      employee.department,
      employee.designation,
      employee.joiningDate,
      employee.status,
      employee.employmentType,
      employee.workLocation,
      employee.reportingManagerId,
      employeeId
    ]
  );

  return findEmployeeById(employeeId);
};

module.exports = {
  findAllEmployees,
  findEmployeeById,
  findDirectReports,
  nextEmployeeId,
  createEmployee,
  insertEmployee,
  findByEmails,
  maxEmployeeNumber,
  setReportingManager,
  updateEmployee
};
