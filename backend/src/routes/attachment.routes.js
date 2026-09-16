const express = require("express");
const attachmentController = require("../controllers/attachment.controller");
const { requireAuth, requirePermission } = require("../middleware/auth.middleware");
const { upload } = require("../middleware/upload.middleware");

const router = express.Router();

// Public on purpose: the signed link in the query string is the permission.
router.get("/file", attachmentController.downloadLocalFile);

// requirePermission() with no arguments just loads req.permissions; the
// controller decides which permission applies based on ownerType.
router.use(requireAuth, requirePermission());

router.get("/", attachmentController.listAttachments);
router.post("/", upload.single("file"), attachmentController.uploadAttachment);
router.delete("/:id", attachmentController.deleteAttachment);

module.exports = router;
