const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const userModel = require("../models/user.model");
const workspaceModel = require("../models/workspace.model");
const adminModel = require("../models/admin.model");

const TOKEN_EXPIRES_IN = "8h";

const INVALID_CREDENTIALS = {
  message: "The email or password is incorrect.",
  code: "INVALID_CREDENTIALS"
};

const buildSession = async (user) => ({
  user: {
    id: user.employee_id,
    name: `${user.first_name} ${user.last_name}`,
    email: user.email,
    designation: user.designation
  },
  userType: {
    id: user.user_type_id,
    name: user.user_type_name,
    isSystem: Boolean(user.user_type_is_system)
  },
  role: {
    id: user.user_type_slug,
    name: user.user_type_name
  },
  permissions: Array.isArray(user.permissions)
    ? user.permissions
    : JSON.parse(user.permissions),
  workspaceIds: await workspaceModel.findWorkspaceIdsForEmployee(user.employee_id),
  features: await adminModel.findFeatures()
});

const login = async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({
      message: "Email and password are required.",
      code: "BAD_REQUEST"
    });
  }

  const user = await userModel.findUserByEmail(String(email).trim().toLowerCase());

  if (!user) {
    return res.status(401).json(INVALID_CREDENTIALS);
  }

  const passwordMatches = await bcrypt.compare(password, user.password_hash);

  if (!passwordMatches) {
    return res.status(401).json(INVALID_CREDENTIALS);
  }

  if (!user.is_active) {
    return res.status(403).json({
      message: "This account has been deactivated.",
      code: "ACCOUNT_INACTIVE"
    });
  }

  const token = jwt.sign(
    {
      userId: user.id,
      employeeId: user.employee_id,
      userTypeId: user.user_type_id
    },
    process.env.JWT_SECRET,
    { expiresIn: TOKEN_EXPIRES_IN }
  );

  res.json({
    token,
    session: await buildSession(user)
  });
};

const me = async (req, res) => {
  const user = await userModel.findUserById(req.user.userId);

  if (!user || !user.is_active) {
    return res.status(401).json({
      message: "Your session is no longer valid. Please log in again.",
      code: "UNAUTHORIZED"
    });
  }

  res.json(await buildSession(user));
};

module.exports = {
  login,
  me
};
