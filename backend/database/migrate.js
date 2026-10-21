/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");
require("dotenv").config();

const DIRECTORY = path.join(__dirname, "migrations");

const connect = async () =>
  mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT) || 3306,
    multipleStatements: true,
    ...(String(process.env.DB_SSL || "").toLowerCase() === "true" ? { ssl: { rejectUnauthorized: true } } : {})
  });

const ensureTable = async (connection) => {
  await connection.query(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
       name VARCHAR(190) PRIMARY KEY,
       applied_at DATETIME NOT NULL
     )`
  );
};

const allFiles = () =>
  fs
    .readdirSync(DIRECTORY)
    .filter((file) => file.endsWith(".sql"))
    .sort();

const appliedNames = async (connection) => {
  const [rows] = await connection.query("SELECT name FROM schema_migrations");
  return new Set(rows.map((row) => row.name));
};

const report = (connection) => async () => {
  const applied = await appliedNames(connection);
  const files = allFiles();

  console.log(`\nDatabase: ${process.env.DB_NAME}\n`);
  files.forEach((file) => console.log(`${applied.has(file) ? "  done   " : "  PENDING"}  ${file}`));
  const pending = files.filter((file) => !applied.has(file));
  console.log(`\n${pending.length} pending, ${applied.size} already applied.\n`);
  return pending;
};

const run = async () => {
  const command = (process.argv[2] || "status").toLowerCase();
  const target = process.argv[3];

  const connection = await connect();
  const status = report(connection);

  try {
    await ensureTable(connection);

    if (command === "status") {
      await status();
      return;
    }

    if (command === "baseline") {
      if (!target) throw new Error('Say where to baseline, for example: node database/migrate.js baseline 19');
      const files = allFiles().filter((file) => file.localeCompare(`${target}`) <= 0 || file.startsWith(`${target}`));
      const upTo = allFiles().filter((file) => parseInt(file, 10) <= parseInt(target, 10));
      const marked = upTo.length > 0 ? upTo : files;

      for (const file of marked) {
        await connection.query("INSERT IGNORE INTO schema_migrations (name, applied_at) VALUES (?, NOW())", [file]);
      }
      console.log(`Marked ${marked.length} file(s) as already applied, without running them.`);
      await status();
      return;
    }

    if (command === "up") {
      const pending = await status();
      if (pending.length === 0) return;

      for (const file of pending) {
        const sql = fs.readFileSync(path.join(DIRECTORY, file), "utf8").trim();
        if (!sql) continue;

        console.log(`Running ${file} …`);
        await connection.beginTransaction();
        try {
          await connection.query(sql);
          await connection.query("INSERT INTO schema_migrations (name, applied_at) VALUES (?, NOW())", [file]);
          await connection.commit();
          console.log(`  done`);
        } catch (error) {
          await connection.rollback();
          console.error(`  failed: ${error.message}`);
          console.error("  Nothing after this file was run. Fix it, then run the command again.");
          process.exitCode = 1;
          return;
        }
      }

      console.log("\nAll migrations applied.\n");
      return;
    }

    console.log("Usage: node database/migrate.js [status | up | baseline <number>]");
  } finally {
    await connection.end();
  }
};

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
