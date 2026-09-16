const notificationModel = require("../models/notification.model");
const pool = require("../config/database");

const actorName = async (employeeId, connection = pool) => {
  if (!employeeId) return "Automation";
  const [rows] = await connection.query(
    "SELECT CONCAT(first_name, ' ', last_name) AS name FROM employees WHERE employee_id = ? LIMIT 1",
    [employeeId]
  );
  return rows[0]?.name ?? "Someone";
};

const others = (employeeIds, actorId) => [...new Set(employeeIds.filter((id) => id && id !== actorId))];

const notify = async ({ recipients, actorId, kind, title, body, task }, connection = pool) => {
  const targets = others(recipients, actorId);
  if (targets.length === 0) return;
  await notificationModel.insertMany(
    targets.map((employeeId) => ({
      employeeId,
      kind,
      title,
      body,
      workspaceId: task.workspaceId,
      taskId: task.id,
      actorId
    })),
    connection
  );
};

const taskAssigned = async ({ task, assigneeIds, actorId, viaRecurring = false }, connection) => {
  const name = await actorName(actorId, connection);
  await notify(
    {
      recipients: assigneeIds,
      actorId,
      kind: viaRecurring ? "recurring" : "assigned",
      title: viaRecurring ? "New recurring task" : "Task assigned to you",
      body: viaRecurring ? `${task.title} was created from a recurring rule` : `${name} assigned you "${task.title}"`,
      task
    },
    connection
  );
};

const taskMoved = async ({ task, assigneeIds, actorId, toName, completed }, connection) => {
  const name = await actorName(actorId, connection);
  await notify(
    {
      recipients: [...assigneeIds, task.createdById],
      actorId,
      kind: completed ? "completed" : "moved",
      title: completed ? "Task completed" : "Task moved",
      body: completed ? `${name} completed "${task.title}"` : `${name} moved "${task.title}" to ${toName}`,
      task
    },
    connection
  );
};

const taskDeleted = async ({ task, assigneeIds, actorId }, connection) => {
  const name = await actorName(actorId, connection);
  await notify(
    {
      recipients: assigneeIds,
      actorId,
      kind: "deleted",
      title: "Task deleted",
      body: `${name} deleted "${task.title}"`,
      task
    },
    connection
  );
};

module.exports = {
  taskAssigned,
  taskMoved,
  taskDeleted
};
