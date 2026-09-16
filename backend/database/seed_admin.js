// Creates the first login account (Master Admin).
// Run once from the backend folder:  node database/seed_admin.js
require("dotenv").config();
const bcrypt = require("bcryptjs");
const pool = require("../src/config/database");

const ADMIN = {
  employeeId: "EMP-0001",
  email: "shanika.peiris@araworkspace.com",
  password: "Admin@123",
  userTypeId: 1
};

const run = async () => {
  const passwordHash = await bcrypt.hash(ADMIN.password, 10);

  await pool.query(
    `INSERT INTO users (employee_id, email, password_hash, user_type_id)
     VALUES (?, ?, ?, ?)`,
    [ADMIN.employeeId, ADMIN.email, passwordHash, ADMIN.userTypeId]
  );

  console.log(`Master admin created: ${ADMIN.email}`);
  await pool.end();
};

run().catch((error) => {
  console.error("Seed failed:", error.message);
  process.exit(1);
});
