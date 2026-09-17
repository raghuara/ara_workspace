const app = require("./app");
const pool = require("./config/database");

const PORT = process.env.PORT || 5000;

pool
  .getConnection()
  .then((connection) => {
    console.log("MySQL connected successfully");
    connection.release();

    const server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

    const shutdown = (signal) => {
      console.log(`${signal} received, shutting down`);
      server.close(() => {
        pool.end().finally(() => process.exit(0));
      });
      setTimeout(() => process.exit(0), 10000).unref();
    };
    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  })
  .catch((error) => {
    console.error("MySQL connection failed:", error.message);
    process.exit(1);
  });
