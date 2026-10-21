const workspaceModel = require("../models/workspace.model");

const emitWorkspaceChange = (io, workspaceId, entityType, action, extra = {}) => {
  if (!io || !workspaceId) return;

  io.to(`workspace:${workspaceId}`).emit("workspace:changed", {
    workspaceId,
    entityType,
    action,
    ...extra
  });
};

const broadcastFrom = (req, workspaceId, entityType, action, extra = {}) =>
  emitWorkspaceChange(req.app.get("io"), workspaceId, entityType, action, {
    actorId: req.user?.employeeId ?? null,
    ...extra
  });

/**
 * Sockets join their workspace rooms once, at connection time. When someone is
 * added to or removed from a workspace, their open tabs are moved to the right
 * rooms here instead of waiting for a refresh.
 */
const refreshRoomsFor = async (io, employeeIds = []) => {
  if (!io) return;

  for (const employeeId of [...new Set(employeeIds.filter(Boolean))]) {
    try {
      const sockets = await io.in(`employee:${employeeId}`).fetchSockets();
      if (sockets.length === 0) continue;

      const workspaceIds = await workspaceModel.findWorkspaceIdsForEmployee(employeeId);

      for (const socket of sockets) {
        for (const room of socket.rooms) {
          if (room.startsWith("workspace:")) socket.leave(room);
        }
        for (const workspaceId of workspaceIds) socket.join(`workspace:${workspaceId}`);
        socket.emit("workspace:access-changed", { workspaceIds });
      }
    } catch (error) {
      console.error(`Could not refresh rooms for ${employeeId}:`, error.message);
    }
  }
};

const refreshRoomsFrom = (req, employeeIds) => refreshRoomsFor(req.app.get("io"), employeeIds);

module.exports = { emitWorkspaceChange, broadcastFrom, refreshRoomsFor, refreshRoomsFrom };
