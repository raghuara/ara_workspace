const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const authRoutes = require("./routes/auth.routes");
const employeeRoutes = require("./routes/employee.routes");
const attachmentRoutes = require("./routes/attachment.routes");
const workspaceRoutes = require("./routes/workspace.routes");
const clientRoutes = require("./routes/client.routes");
const ticketRoutes = require("./routes/ticket.routes");
const taskRoutes = require("./routes/task.routes");
const { departmentRoutes, designationRoutes } = require("./routes/catalog.routes");
const adminRoutes = require("./routes/admin.routes");
const activityRoutes = require("./routes/activity.routes");
const dashboardRoutes = require("./routes/dashboard.routes");
const recurringRoutes = require("./routes/recurring.routes");
const notificationRoutes = require("./routes/notification.routes");
const performanceRoutes = require("./routes/performance.routes");
const { notFoundHandler, errorHandler } = require("./middleware/error.middleware");

const app = express();
const isProduction = process.env.NODE_ENV === "production";

app.set("trust proxy", 1);
app.disable("x-powered-by");

const allowedOrigins = [
  "http://localhost:5003",
  "http://localhost:5199",
  ...(process.env.CLIENT_URL || "").split(",").map((origin) => origin.trim()).filter(Boolean)
];

const LAN_ORIGIN = /^http:\/\/(192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}):5003$/;

const isAllowedOrigin = (origin) => !origin || allowedOrigins.includes(origin) || LAN_ORIGIN.test(origin);

app.use(
  cors({
    origin: (origin, callback) => callback(null, isAllowedOrigin(origin))
  })
);


app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
  })
);
app.use(express.json({ limit: "1mb" }));

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many sign-in attempts. Try again in 15 minutes.", code: "RATE_LIMITED" }
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 600,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many requests. Slow down a little.", code: "RATE_LIMITED" }
});

app.get("/api/health", (req, res) => {
  res.json({ message: "ARA Workspace API is running" });
});

app.use("/api", apiLimiter);
app.use("/api/auth/login", loginLimiter);

app.use("/api/auth", authRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/attachments", attachmentRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/designations", designationRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/performance", performanceRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/activity", activityRoutes);
app.use("/api", dashboardRoutes);
app.use("/api", workspaceRoutes);
app.use("/api", taskRoutes);
app.use("/api", recurringRoutes);

app.use("/api", notFoundHandler);

const clientBuild = path.resolve(__dirname, "../../frontend/dist");
if (isProduction && fs.existsSync(clientBuild)) {
  app.use(express.static(clientBuild, { maxAge: "1h", index: false }));
  app.get(/^\/(?!api\/).*/, (req, res) => {
    res.sendFile(path.join(clientBuild, "index.html"));
  });
}

app.use(notFoundHandler);
app.use(errorHandler);

app.isAllowedOrigin = isAllowedOrigin;

module.exports = app;
