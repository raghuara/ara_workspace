const express = require("express");
const notificationController = require("../controllers/notification.controller");
const { requireAuth } = require("../middleware/auth.middleware");

const router = express.Router();

router.use(requireAuth);

router.get("/", notificationController.listNotifications);
router.post("/read-all", notificationController.markAllRead);
router.post("/:id/read", notificationController.markRead);

module.exports = router;
