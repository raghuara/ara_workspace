const express = require("express");
const performanceController = require("../controllers/performance.controller");
const { requireAuth, requirePermission } = require("../middleware/auth.middleware");

const router = express.Router();

const canView = requirePermission("review.view");
const canUpdate = requirePermission("review.update");

router.use(requireAuth);

router.get("/reviews", canView, performanceController.listReviews);
router.get("/reviews/pending", canView, performanceController.listPending);
router.get("/reviews/periods", canView, performanceController.listPeriods);
router.get("/reviews/employee/:employeeId", canView, performanceController.listByEmployee);
router.get("/reviews/:id", canView, performanceController.getReview);
router.post("/reviews", canUpdate, performanceController.createReview);
router.put("/reviews/:id", canUpdate, performanceController.updateReview);
router.delete("/reviews/:id", canUpdate, performanceController.deleteReview);

module.exports = router;
