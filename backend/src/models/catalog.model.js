const pool = require("../config/database");

const createCatalogModel = ({ table, employeeColumn }) => {
  const SELECT = `
    SELECT
      c.id,
      c.name,
      c.description,
      c.is_active,
      (SELECT COUNT(*) FROM employees e WHERE e.${employeeColumn} = c.name) AS employee_count
    FROM ${table} c
  `;

  const findAll = async () => {
    const [rows] = await pool.query(`${SELECT} ORDER BY c.name`);
    return rows;
  };

  const findById = async (id) => {
    const [rows] = await pool.query(`${SELECT} WHERE c.id = ? LIMIT 1`, [id]);
    return rows[0] || null;
  };

  const findActiveByName = async (name) => {
    const [rows] = await pool.query(`SELECT id, name FROM ${table} WHERE name = ? AND is_active = TRUE LIMIT 1`, [name]);
    return rows[0] || null;
  };

  const insert = async (item) => {
    const [result] = await pool.query(`INSERT INTO ${table} (name, description, is_active) VALUES (?, ?, ?)`, [
      item.name,
      item.description,
      item.isActive
    ]);
    return result.insertId;
  };

  const update = async (id, item, connection) => {
    await connection.query(`UPDATE ${table} SET name = ?, description = ?, is_active = ? WHERE id = ?`, [
      item.name,
      item.description,
      item.isActive,
      id
    ]);
  };

  const renameOnEmployees = async (oldName, newName, connection) => {
    await connection.query(`UPDATE employees SET ${employeeColumn} = ? WHERE ${employeeColumn} = ?`, [newName, oldName]);
  };

  const remove = async (id) => {
    await pool.query(`DELETE FROM ${table} WHERE id = ?`, [id]);
  };

  return { findAll, findById, findActiveByName, insert, update, renameOnEmployees, remove };
};

const departmentModel = createCatalogModel({ table: "departments", employeeColumn: "department" });
const designationModel = createCatalogModel({ table: "designations", employeeColumn: "designation" });

module.exports = {
  departmentModel,
  designationModel
};
