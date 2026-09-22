const express = require("express");
const taskController = require("../controllers/task.controller");
const { requireAuth, requirePermission, requireAnyPermission } = require("../middleware/auth.middleware");

const router = express.Router();

const canView = requirePermission("task.view");

router.use(requireAuth);

router.get("/workspaces/:workspaceId/board", canView, taskController.getBoard);
router.get("/workspaces/:workspaceId/tasks", canView, taskController.listTasks);
router.post("/workspaces/:workspaceId/tasks", requirePermission("task.create"), taskController.createTask);
router.get("/workspaces/:workspaceId/workload", requirePermission("report.view"), taskController.getWorkloadReport);

router.get("/tasks/:taskId", canView, taskController.getTask);
router.put(
  "/tasks/:taskId",
  requireAnyPermission("task.update", "task.assign", "task.weightage.set", "task.move"),
  taskController.updateTask
);
router.post("/tasks/:taskId/move", requirePermission("task.move"), taskController.moveTask);
router.delete("/tasks/:taskId", requirePermission("task.delete"), taskController.deleteTask);
router.get("/tasks/:taskId/history", canView, taskController.getTaskHistory);
router.get("/tasks/:taskId/comments", canView, taskController.listComments);
router.post("/tasks/:taskId/comments", canView, taskController.createComment);
router.put("/comments/:commentId", canView, taskController.updateComment);
router.delete("/comments/:commentId", canView, taskController.deleteComment);

module.exports = router;
