const express = require("express");
const employeeController = require("../controllers/employee.controller");
const { requireAuth, requirePermission } = require("../middleware/auth.middleware");

const router = express.Router();

const canView = requirePermission("employee.view");
const canUpdate = requirePermission("employee.update");

router.use(requireAuth);

router.get("/", canView, employeeController.getAllEmployees);
router.post("/", canUpdate, employeeController.createEmployee);
router.get("/:employeeId", canView, employeeController.getEmployeeById);
router.put("/:employeeId", canUpdate, employeeController.updateEmployee);
router.get("/:employeeId/direct-reports", canView, employeeController.getDirectReports);

module.exports = router;
