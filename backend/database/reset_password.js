require("dotenv").config();
const bcrypt = require("bcryptjs");
const pool = require("../src/config/database");

const [email, password] = process.argv.slice(2);

const run = async () => {
  if (!email || !password) {
    console.error("Usage: node database/reset_password.js <login-email> <new-password>");
    process.exit(1);
  }
  if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(password)) {
    console.error("Password must be at least 8 characters and include a letter and a number.");
    process.exit(1);
  }

  const [result] = await pool.query(
    "UPDATE users SET password_hash = ?, must_change_password = FALSE, is_active = TRUE WHERE email = ?",
    [await bcrypt.hash(password, 10), email.toLowerCase()]
  );

  if (result.affectedRows === 0) {
    console.error(`No login found for ${email}`);
    process.exit(1);
  }

  console.log(`Password reset for ${email}. You can sign in now.`);
  await pool.end();
};

run().catch((error) => {
  console.error("Reset failed:", error.message);
  process.exit(1);
});
