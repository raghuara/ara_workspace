const express = require("express");
const recurringController = require("../controllers/recurring.controller");
const { requireAuth, requirePermission } = require("../middleware/auth.middleware");

const router = express.Router();

router.use(requireAuth, requirePermission("task.recurring"));

router.get("/workspaces/:workspaceId/recurring-tasks", recurringController.listRules);
router.post("/workspaces/:workspaceId/recurring-tasks", recurringController.createRule);
router.get("/recurring-tasks/:ruleId", recurringController.getRule);
router.put("/recurring-tasks/:ruleId", recurringController.updateRule);
router.post("/recurring-tasks/:ruleId/status", recurringController.setStatus);
router.delete("/recurring-tasks/:ruleId", recurringController.deleteRule);

module.exports = router;
