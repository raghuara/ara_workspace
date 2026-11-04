const multer = require("multer");

// 404 for any URL no router claimed.
const notFoundHandler = (req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}`, code: "NOT_FOUND" });
};

// Last stop for every error. Express 5 sends rejected async handlers here
// automatically, so controllers can just `throw` or let awaits fail.
const errorHandler = (error, req, res, next) => {
  if (res.headersSent) return next(error);

  if (error instanceof multer.MulterError) {
    const tooLarge = error.code === "LIMIT_FILE_SIZE";
    return res.status(tooLarge ? 413 : 400).json({
      message: tooLarge ? "Files must be 10 MB or smaller." : error.message,
      code: tooLarge ? "FILE_TOO_LARGE" : "BAD_REQUEST"
    });
  }

  if (error.type === "entity.parse.failed") {
    return res.status(400).json({ message: "The request body is not valid JSON.", code: "BAD_REQUEST" });
  }

  console.error(error);

  if (error.code === "ER_BAD_FIELD_ERROR") {
    const column = /Unknown column '([^']+)'/.exec(error.sqlMessage || "")?.[1] ?? "one it needs";
    return res.status(500).json({
      message: `The database is missing the column "${column}". Run the pending migrations, then try again.`,
      code: "MIGRATION_PENDING"
    });
  }

  if (error.code === "ER_NO_SUCH_TABLE") {
    const table = /Table '[^.']*\.?([^.']+)' doesn't exist/.exec(error.sqlMessage || "")?.[1] ?? "one it needs";
    return res.status(500).json({
      message: `The database is missing the table "${table}". Run the pending migrations, then try again.`,
      code: "MIGRATION_PENDING"
    });
  }

  // On a developer machine the real reason goes back to the browser, so a
  // failure is readable without digging through the server console. Never off
  // localhost: the message carries table and column names.
  const isLocal = /^(localhost|127\.0\.0\.1|\[?::1\]?)$/.test(req.hostname || "");
  if (isLocal) {
    return res.status(500).json({
      message: `Unexpected server error: ${error.sqlMessage || error.message}`,
      code: error.code || "INTERNAL"
    });
  }

  res.status(500).json({ message: "Unexpected server error.", code: "INTERNAL" });
};

module.exports = {
  notFoundHandler,
  errorHandler
};
