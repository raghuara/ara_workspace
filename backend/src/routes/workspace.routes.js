const express = require("express");
const workspaceController = require("../controllers/workspace.controller");
const { requireAuth, requirePermission } = require("../middleware/auth.middleware");

const router = express.Router();

const canView = requirePermission("workspace.view");
const canCreate = requirePermission("workspace.create");
const canUpdate = requirePermission("workspace.update");
const canDelete = requirePermission("workspace.delete");
const canManageGroups = requirePermission("group.manage");
const canManageTeams = requirePermission("team.manage");
const canManageColumns = requirePermission("status.manage");

router.use(requireAuth);

router.get("/workspaces", canView, workspaceController.listWorkspaces);
router.post("/workspaces", canCreate, workspaceController.createWorkspace);
router.get("/workspaces/:workspaceId", canView, workspaceController.getWorkspace);
router.put("/workspaces/:workspaceId", canUpdate, workspaceController.updateWorkspace);
router.delete("/workspaces/:workspaceId", canDelete, workspaceController.deleteWorkspace);

router.get("/workspaces/:workspaceId/structure", canView, workspaceController.getStructure);
router.post("/workspaces/:workspaceId/groups", canManageGroups, workspaceController.createGroup);
router.put("/groups/:groupId", canManageGroups, workspaceController.updateGroup);
router.delete("/groups/:groupId", canManageGroups, workspaceController.deleteGroup);

router.post("/groups/:groupId/teams", canManageTeams, workspaceController.createTeam);
router.put("/teams/:teamId", canManageTeams, workspaceController.updateTeam);
router.delete("/teams/:teamId", canManageTeams, workspaceController.deleteTeam);

router.get("/workspaces/:workspaceId/columns", canView, workspaceController.listColumns);
router.post("/workspaces/:workspaceId/columns", canManageColumns, workspaceController.createColumns);
router.put("/columns/:columnId", canManageColumns, workspaceController.updateColumn);
router.delete("/columns/:columnId", canManageColumns, workspaceController.deleteColumn);

router.post("/workspaces/:workspaceId/members", canUpdate, workspaceController.addMember);
router.put("/workspaces/:workspaceId/members/:employeeId", canUpdate, workspaceController.updateMember);
router.delete("/workspaces/:workspaceId/members/:employeeId", canUpdate, workspaceController.removeMember);

module.exports = router;
