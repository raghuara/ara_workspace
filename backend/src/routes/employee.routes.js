const express = require("express");
const employeeController = require("../controllers/employee.controller");
const employeeImportController = require("../controllers/employeeImport.controller");
const { upload } = require("../middleware/upload.middleware");
const { requireAuth, requirePermission } = require("../middleware/auth.middleware");

const router = express.Router();

const canView = requirePermission("employee.view");
const canUpdate = requirePermission("employee.update");

router.use(requireAuth);

router.get("/", canView, employeeController.getAllEmployees);
router.get("/import/template", canUpdate, employeeImportController.downloadTemplate);
router.post("/import/preview", canUpdate, upload.single("file"), employeeImportController.previewImport);
router.post("/import", canUpdate, upload.single("file"), employeeImportController.runImport);
router.post("/", canUpdate, employeeController.createEmployee);
router.get("/:employeeId", canView, employeeController.getEmployeeById);
router.put("/:employeeId", canUpdate, employeeController.updateEmployee);
router.get("/:employeeId/direct-reports", canView, employeeController.getDirectReports);

module.exports = router;
