const express = require("express");
const taskController = require("../controllers/task.controller");
const { requireAuth, requirePermission } = require("../middleware/auth.middleware");

const router = express.Router();

const canView = requirePermission("task.view");

router.use(requireAuth);

router.get("/workspaces/:workspaceId/board", canView, taskController.getBoard);
router.get("/workspaces/:workspaceId/tasks", canView, taskController.listTasks);
router.post("/workspaces/:workspaceId/tasks", requirePermission("task.create"), taskController.createTask);
router.get("/workspaces/:workspaceId/workload", requirePermission("report.view"), taskController.getWorkloadReport);

router.get("/tasks/:taskId", canView, taskController.getTask);
router.put("/tasks/:taskId", requirePermission("task.update"), taskController.updateTask);
router.post("/tasks/:taskId/move", requirePermission("task.move"), taskController.moveTask);
router.delete("/tasks/:taskId", requirePermission("task.delete"), taskController.deleteTask);
router.get("/tasks/:taskId/history", canView, taskController.getTaskHistory);

module.exports = router;
