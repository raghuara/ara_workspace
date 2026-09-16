const express = require("express");
const { departmentController, designationController } = require("../controllers/catalog.controller");
const { requireAuth, requirePermission } = require("../middleware/auth.middleware");

const mount = (controller) => {
  const router = express.Router();
  router.use(requireAuth);
  router.get("/", requirePermission("employee.view"), controller.list);
  router.post("/", requirePermission("employee.update"), controller.create);
  router.put("/:id", requirePermission("employee.update"), controller.update);
  router.delete("/:id", requirePermission("employee.update"), controller.remove);
  return router;
};

module.exports = {
  departmentRoutes: mount(departmentController),
  designationRoutes: mount(designationController)
};
