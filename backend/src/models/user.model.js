const pool = require("../config/database");

const USER_SELECT = `
  SELECT
    u.id,
    u.employee_id,
    u.email,
    u.password_hash,
    u.is_active,
    u.must_change_password,
    ut.id        AS user_type_id,
    ut.name      AS user_type_name,
    ut.slug      AS user_type_slug,
    ut.is_system AS user_type_is_system,
    ut.permissions,
    e.first_name,
    e.last_name,
    e.designation
  FROM users u
  JOIN user_types ut ON ut.id = u.user_type_id
  JOIN employees  e  ON e.employee_id = u.employee_id
`;

const findUserByEmail = async (email) => {
  const [rows] = await pool.query(`${USER_SELECT} WHERE u.email = ? LIMIT 1`, [email]);
  return rows[0] || null;
};

const findUserById = async (id) => {
  const [rows] = await pool.query(`${USER_SELECT} WHERE u.id = ? LIMIT 1`, [id]);
  return rows[0] || null;
};

module.exports = {
  findUserByEmail,
  findUserById
};
