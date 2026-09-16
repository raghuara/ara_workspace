const express = require("express");
const adminController = require("../controllers/admin.controller");
const accountController = require("../controllers/account.controller");
const { requireAuth, requirePermission } = require("../middleware/auth.middleware");

const router = express.Router();

const canViewTypes = requirePermission("usertype.view");
const canManageTypes = requirePermission("usertype.manage");
const canManageFeatures = requirePermission("feature.manage");
const canManageAutomations = requirePermission("automation.manage");

router.use(requireAuth);

router.get("/user-types", canViewTypes, adminController.listUserTypes);
router.get("/user-types/:id/members", canViewTypes, adminController.listUserTypeMembers);
router.post("/user-types", canManageTypes, adminController.createUserType);
router.post("/user-types/:id/duplicate", canManageTypes, adminController.duplicateUserType);
router.put("/user-types/:id", canManageTypes, adminController.updateUserType);
router.delete("/user-types/:id", canManageTypes, adminController.deleteUserType);

router.get("/accounts", canManageTypes, accountController.listAccounts);
router.post("/accounts", canManageTypes, accountController.createAccount);
router.put("/accounts/:employeeId", canManageTypes, accountController.updateAccount);
router.post("/accounts/:employeeId/reset-password", canManageTypes, accountController.resetPassword);

router.get("/features", canManageFeatures, adminController.getFeatures);
router.put("/features/:key", canManageFeatures, adminController.setFeature);

router.get("/automations", requirePermission(), adminController.getAutomations);
router.put("/automations/:id", canManageAutomations, adminController.setAutomation);

module.exports = router;
