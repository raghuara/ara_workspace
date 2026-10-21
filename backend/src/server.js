
const http = require("http");
const app = require("./app");
const pool = require("./config/database");
const { Server } = require("socket.io");
const socketAuth = require("./middleware/socketAuth.middleware");
const workspaceModel = require("./models/workspace.model");

const PORT = process.env.PORT || 5000;

pool
  .getConnection()
  .then((connection) => {
    console.log("MySQL connected successfully");
    connection.release();

    // Create the HTTP server
    const server = http.createServer(app);

    // Attach Socket.IO
    const io = new Server(server, {
      cors: {
        origin: (origin, callback) => callback(null, app.isAllowedOrigin(origin)),
        methods: ["GET", "POST"],
        credentials: true,
      },
    });

    // Make Socket.IO available to controllers
    app.set("io", io);

    io.use(socketAuth);

    io.on("connection", async (socket) => {
      console.log(`Socket connected: ${socket.id}, user: ${socket.user.userId}`);

      try {
        const workspaceIds = await workspaceModel.findWorkspaceIdsForEmployee(
          socket.user.employeeId
        );

        // Personal room: lets the server move this tab between workspace rooms
        // when the person is added to or removed from a workspace.
        socket.join(`employee:${socket.user.employeeId}`);

        for (const workspaceId of workspaceIds) {
          socket.join(`workspace:${workspaceId}`);
        }

        console.log(
          `Socket ${socket.id} joined ${workspaceIds.length} authorized workspace room(s)`
        );
      } catch (error) {
        console.error("Failed to join workspace rooms:", error.message);
        socket.disconnect(true);
        return;
      }

      socket.on("disconnect", () => {
        console.log(`Socket disconnected: ${socket.id}`);
      });
    });


    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log("Socket.IO is ready");
    });

    const shutdown = (signal) => {
      console.log(`${signal} received, shutting down`);

      io.close(() => {
        pool.end().finally(() => process.exit(0));
      });

      setTimeout(() => process.exit(0), 10000).unref();
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  })
  .catch((error) => {
    console.error("MySQL connection failed:", error.message);
    process.exit(1);
  });
