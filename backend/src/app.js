const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/auth.routes");
const employeeRoutes = require("./routes/employee.routes");
const attachmentRoutes = require("./routes/attachment.routes");
const workspaceRoutes = require("./routes/workspace.routes");
const clientRoutes = require("./routes/client.routes");
const taskRoutes = require("./routes/task.routes");
const departmentRoutes = require("./routes/department.routes");
const adminRoutes = require("./routes/admin.routes");
const activityRoutes = require("./routes/activity.routes");
const dashboardRoutes = require("./routes/dashboard.routes");
const { notFoundHandler, errorHandler } = require("./middleware/error.middleware");

const app = express();

// Browsers block a page on one port (React, 5173) from calling an API on
// another (Express, 5000) unless the API explicitly allows that origin.
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5199",
  process.env.CLIENT_URL
].filter(Boolean);

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({
    message: "ARA Workspace API is running"
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/attachments", attachmentRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/activity", activityRoutes);
app.use("/api", dashboardRoutes);
app.use("/api", workspaceRoutes);
app.use("/api", taskRoutes);

// These two must stay last: 404 for unmatched URLs, then the error catcher.
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
