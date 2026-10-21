const express = require("express");
const ticketController = require("../controllers/ticket.controller");
const { requireAuth, requirePermission } = require("../middleware/auth.middleware");

const router = express.Router();

const canView = requirePermission("ticket.view");
const canManage = requirePermission("ticket.manage");

router.use(requireAuth);

router.get("/", canView, ticketController.listTickets);
router.post("/", canManage, ticketController.createTicket);
router.get("/:ticketId", canView, ticketController.getTicket);
router.put("/:ticketId", canManage, ticketController.updateTicket);
router.post("/:ticketId/status", canManage, ticketController.changeStatus);
router.get("/:ticketId/events", canView, ticketController.getTicketEvents);
router.post("/:ticketId/events", canManage, ticketController.addNote);
router.delete("/:ticketId", canManage, ticketController.deleteTicket);

module.exports = router;
