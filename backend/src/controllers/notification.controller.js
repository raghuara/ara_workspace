const notificationModel = require("../models/notification.model");

const mapNotification = (row) => ({
  id: row.id,
  kind: row.kind,
  title: row.title,
  body: row.body ?? "",
  workspaceId: row.workspace_id,
  taskId: row.task_id,
  actorId: row.actor_id,
  actorName: row.actor_id ? (row.actor_name ?? "Unknown") : "Automation",
  unread: !row.is_read,
  createdOn: row.created_at
});

const listNotifications = async (req, res) => {
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
  await notificationModel.pruneOld(req.user.employeeId);
  const [rows, unreadCount] = await Promise.all([
    notificationModel.findForEmployee(req.user.employeeId, limit),
    notificationModel.countUnread(req.user.employeeId)
  ]);
  res.json({ items: rows.map(mapNotification), unreadCount });
};

const markRead = async (req, res) => {
  const found = await notificationModel.markRead(req.user.employeeId, req.params.id);
  if (!found) return res.status(404).json({ message: "That notification does not exist.", code: "NOT_FOUND" });
  res.json({ unreadCount: await notificationModel.countUnread(req.user.employeeId) });
};

const markAllRead = async (req, res) => {
  await notificationModel.markAllRead(req.user.employeeId);
  res.json({ unreadCount: 0 });
};

module.exports = {
  listNotifications,
  markRead,
  markAllRead
};
