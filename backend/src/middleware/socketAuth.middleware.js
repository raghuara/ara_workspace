
const jwt = require("jsonwebtoken");
const userModel = require("../models/user.model");

const socketAuth = async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next(new Error("Authentication required."));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Confirm the user still exists and is active.
    const user = await userModel.findUserById(decoded.userId);

    if (!user || !user.is_active) {
      return next(new Error("Your session is no longer valid."));
    }

    // Attach verified database identity to this socket.
    socket.user = {
      userId: user.id,
      employeeId: user.employee_id,
      userTypeId: user.user_type_id,
      userTypeSlug: user.user_type_slug,
      isSystemUserType: Boolean(user.user_type_is_system),
    };

    next();
  } catch (error) {
    next(new Error("Socket authentication failed."));
  }
};

module.exports = socketAuth;
