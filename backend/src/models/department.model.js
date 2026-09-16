const pool = require("../config/database");

const DEPARTMENT_SELECT = `
  SELECT
    d.id,
    d.name,
    d.description,
    d.is_active,
    (SELECT COUNT(*) FROM employees e WHERE e.department = d.name) AS employee_count
  FROM departments d
`;

const findAllDepartments = async () => {
  const [rows] = await pool.query(`${DEPARTMENT_SELECT} ORDER BY d.name`);
  return rows;
};

const findDepartmentById = async (id, connection = pool) => {
  const [rows] = await connection.query(`${DEPARTMENT_SELECT} WHERE d.id = ? LIMIT 1`, [id]);
  return rows[0] || null;
};

const findActiveDepartmentByName = async (name) => {
  const [rows] = await pool.query("SELECT id, name FROM departments WHERE name = ? AND is_active = TRUE LIMIT 1", [
    name
  ]);
  return rows[0] || null;
};

const insertDepartment = async (department) => {
  const [result] = await pool.query("INSERT INTO departments (name, description, is_active) VALUES (?, ?, ?)", [
    department.name,
    department.description,
    department.isActive
  ]);
  return result.insertId;
};

const updateDepartment = async (id, department, connection) => {
  await connection.query("UPDATE departments SET name = ?, description = ?, is_active = ? WHERE id = ?", [
    department.name,
    department.description,
    department.isActive,
    id
  ]);
};

const renameOnEmployees = async (oldName, newName, connection) => {
  await connection.query("UPDATE employees SET department = ? WHERE department = ?", [newName, oldName]);
};

const deleteDepartment = async (id) => {
  await pool.query("DELETE FROM departments WHERE id = ?", [id]);
};

module.exports = {
  findAllDepartments,
  findDepartmentById,
  findActiveDepartmentByName,
  insertDepartment,
  updateDepartment,
  renameOnEmployees,
  deleteDepartment
};
