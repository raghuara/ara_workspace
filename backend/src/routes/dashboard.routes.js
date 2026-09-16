const express = require("express");
const dashboardController = require("../controllers/dashboard.controller");
const { requireAuth, requirePermission } = require("../middleware/auth.middleware");

const router = express.Router();

router.use(requireAuth);

router.get("/dashboard/overview", requirePermission("workspace.view"), dashboardController.getOverview);
router.get("/dashboard/employees", requirePermission("employee.view"), dashboardController.getEmployeeStats);
router.get("/dashboard/recent-employees", requirePermission("employee.view"), dashboardController.getRecentEmployees);
router.get("/workspaces/:workspaceId/summary", requirePermission("workspace.view"), dashboardController.getScopeSummary);

module.exports = router;
