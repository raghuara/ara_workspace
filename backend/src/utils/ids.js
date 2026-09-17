const pool = require("../config/database");

const TABLES = {
  WS: "workspaces",
  GRP: "workspace_groups",
  TEAM: "teams",
  COL: "status_columns",
  CLI: "clients",
  TSK: "tasks",
  RCR: "recurring_tasks",
  PRV: "performance_reviews"
};

const PADDING = {
  TSK: 4,
  PRV: 4
};

const nextId = async (prefix, connection = pool) => {
  const table = TABLES[prefix];
  if (!table) throw new Error(`Unknown id prefix: ${prefix}`);

  const [[{ max_num }]] = await connection.query(
    `SELECT MAX(CAST(SUBSTRING(id, ?) AS UNSIGNED)) AS max_num FROM ${table}`,
    [prefix.length + 2]
  );

  const next = (max_num || 0) + 1;
  const pad = PADDING[prefix] || 0;
  return `${prefix}-${String(next).padStart(pad, "0")}`;
};

module.exports = {
  nextId
};
