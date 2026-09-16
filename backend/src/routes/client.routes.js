const express = require("express");
const clientController = require("../controllers/client.controller");
const { requireAuth, requirePermission } = require("../middleware/auth.middleware");

const router = express.Router();

router.use(requireAuth);

router.get("/", requirePermission("client.view"), clientController.listClients);
router.get("/options", requirePermission("client.view"), clientController.listClientOptions);
router.post("/", requirePermission("client.create"), clientController.createClient);
router.put("/:clientId", requirePermission("client.update"), clientController.updateClient);
router.delete("/:clientId", requirePermission("client.delete"), clientController.deleteClient);

module.exports = router;
