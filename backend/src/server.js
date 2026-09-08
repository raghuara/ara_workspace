const app = require("./app");
const pool = require("./config/database");

const PORT = process.env.PORT || 5000;

pool.getConnection()
  .then((connection) => {
    console.log("MySQL connected successfully");
    connection.release();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("MySQL connection failed:", error.message);
  });