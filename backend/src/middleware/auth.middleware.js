const jwt = require("jsonwebtoken");
const userModel = require("../models/user.model");

// Runs before a protected route. Reads the token from the
// "Authorization: Bearer <token>" header, verifies it, and attaches the
// decoded user to req.user so the controller knows who is calling.
const requireAuth = (req, res, next) => {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({
      message: "You must be logged in.",
      code: "UNAUTHORIZED"
    });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (error) {
    return res.status(401).json({
      message: "Your session has expired. Please log in again.",
      code: "TOKEN_INVALID"
    });
  }
};

// Runs after requireAuth. Loads the caller's current permissions from the
// database (not the token) so a role edit takes effect immediately.
// Usage: router.post("/", requireAuth, requirePermission("employee.update"), handler)
const requirePermission = (...required) => async (req, res, next) => {
  const user = await userModel.findUserById(req.user.userId);

  if (!user || !user.is_active) {
    return res.status(401).json({
      message: "Your session is no longer valid. Please log in again.",
      code: "UNAUTHORIZED"
    });
  }

  const granted = Array.isArray(user.permissions)
    ? user.permissions
    : JSON.parse(user.permissions);

  const missing = required.filter((permission) => !granted.includes(permission));

  if (missing.length > 0) {
    return res.status(403).json({
      message: "You do not have permission to do this.",
      code: "FORBIDDEN"
    });
  }

  req.permissions = granted;
  next();
};

module.exports = {
  requireAuth,
  requirePermission
};
