const jwt = require("jsonwebtoken");
const userModel = require("../models/user.model");
const { effectivePermissions } = require("../services/permissions.service");
const { signSession, needsRefresh, isRevoked } = require("../utils/token");

const SESSION_HEADER = "X-Session-Token";

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
    if (needsRefresh(req.user)) res.setHeader(SESSION_HEADER, signSession(req.user));
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
const checkPermissions = (isAllowed) => async (req, res, next) => {
  const user = await userModel.findUserById(req.user.userId);

  if (!user || !user.is_active) {
    return res.status(401).json({
      message: "Your session is no longer valid. Please log in again.",
      code: "UNAUTHORIZED"
    });
  }

  if (isRevoked(user, req.user)) {
    return res.status(401).json({
      message: "Your password changed, so this session ended. Please log in again.",
      code: "TOKEN_INVALID"
    });
  }

  const granted = await effectivePermissions(
    Array.isArray(user.permissions) ? user.permissions : JSON.parse(user.permissions),
    user.employee_id
  );

  if (!isAllowed(granted)) {
    return res.status(403).json({
      message: "You do not have permission to do this.",
      code: "FORBIDDEN"
    });
  }

  req.permissions = granted;
  next();
};

const requirePermission = (...required) =>
  checkPermissions((granted) => required.every((permission) => granted.includes(permission)));

// Passes when the caller holds at least one of the listed permissions.
const requireAnyPermission = (...options) =>
  checkPermissions((granted) => options.some((permission) => granted.includes(permission)));

module.exports = {
  requireAuth,
  requirePermission,
  requireAnyPermission
};
