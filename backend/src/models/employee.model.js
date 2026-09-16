const pool = require("../config/database");

const EMPLOYEE_SELECT = `
  SELECT
    e.id,
    e.employee_id,
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
    CONCAT(m.first_name, ' ', m.last_name) AS reporting_manager
  FROM employees e
  LEFT JOIN employees m ON m.employee_id = e.reporting_manager_id
`;

const buildFilters = ({ search, department, status }) => {
  const clauses = [];
  const params = [];

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

const findAllEmployees = async ({ search, department, status, page, pageSize }) => {
  const { where, params } = buildFilters({ search, department, status });
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

const createEmployee = async (employee) => {
  await pool.query(
    `INSERT INTO employees
       (employee_id, first_name, last_name, email, phone, department, designation,
        joining_date, status, employment_type, work_location, reporting_manager_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      employee.employeeId,
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

  return findEmployeeById(employee.employeeId);
};

const updateEmployee = async (employeeId, employee) => {
  await pool.query(
    `UPDATE employees
     SET first_name = ?, last_name = ?, email = ?, phone = ?, department = ?,
         designation = ?, joining_date = ?, status = ?, employment_type = ?,
         work_location = ?, reporting_manager_id = ?
     WHERE employee_id = ?`,
    [
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
  updateEmployee
};
