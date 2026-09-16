const express = require("express");
const departmentController = require("../controllers/department.controller");
const { requireAuth, requirePermission } = require("../middleware/auth.middleware");

const router = express.Router();

router.use(requireAuth);

router.get("/", requirePermission("employee.view"), departmentController.listDepartments);
router.post("/", requirePermission("employee.update"), departmentController.createDepartment);
router.put("/:id", requirePermission("employee.update"), departmentController.updateDepartment);
router.delete("/:id", requirePermission("employee.update"), departmentController.deleteDepartment);

module.exports = router;
