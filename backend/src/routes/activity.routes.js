const express = require("express");
const activityController = require("../controllers/activity.controller");
const { requireAuth, requirePermission } = require("../middleware/auth.middleware");

const router = express.Router();

router.use(requireAuth, requirePermission("activity.view"));

router.get("/", activityController.listActivity);
router.get("/actors", activityController.listActors);

module.exports = router;
