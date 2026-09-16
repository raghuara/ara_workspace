const adminModel = require("../models/admin.model");
const { FEATURES, AUTOMATION_RULES } = require("../constants/admin");
const { TONES } = require("../constants/workspace");

const text = (value) => (typeof value === "string" ? value.trim() : "");
const tone = (value, fallback) => (TONES.includes(value) ? value : fallback);
const slugify = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const parseJson = (value, fallback) => {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};
const permissionList = (value) =>
  Array.isArray(value) ? [...new Set(value.map(text).filter((key) => /^[a-z]+(\.[a-z]+)*$/.test(key)))] : [];

const badRequest = (res, message) => res.status(400).json({ message, code: "BAD_REQUEST" });
const notFound = (res, message) => res.status(404).json({ message, code: "NOT_FOUND" });

const mapUserType = (row) => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
  description: row.description ?? "",
  isSystem: Boolean(row.is_system),
  permissionsLocked: Boolean(row.permissions_locked),
  tone: row.tone,
  memberCount: row.member_count,
  permissions: parseJson(row.permissions, [])
});

const listUserTypes = async (req, res) => {
  res.json((await adminModel.findAllUserTypes()).map(mapUserType));
};

const listUserTypeMembers = async (req, res) => {
  const userType = await adminModel.findUserTypeById(req.params.id);
  if (!userType) return notFound(res, "That user type does not exist.");

  const rows = await adminModel.findUserTypeMembers(userType.id);
  res.json(
    rows.map((row) => ({
      id: row.employee_id,
      fullName: row.full_name,
      designation: row.designation,
      workspaces: row.workspaces ? row.workspaces.split(",") : []
    }))
  );
};

const createUserType = async (req, res) => {
  const name = text(req.body.name).slice(0, 50);
  if (!name) return badRequest(res, "A user type name is required.");
  if (await adminModel.userTypeNameExists(name)) return badRequest(res, "A user type with that name already exists.");

  const id = await adminModel.insertUserType({
    name,
    slug: slugify(name),
    description: text(req.body.description).slice(0, 255) || null,
    tone: tone(req.body.tone, "teal"),
    permissions: permissionList(req.body.permissions)
  });

  res.status(201).json(mapUserType(await adminModel.findUserTypeById(id)));
};

const duplicateUserType = async (req, res) => {
  const source = await adminModel.findUserTypeById(req.params.id);
  if (!source) return notFound(res, "That user type does not exist.");

  const base = `Copy of ${source.name}`;
  let name = base;
  let n = 2;
  while (await adminModel.userTypeNameExists(name)) name = `${base} ${n++}`;

  const id = await adminModel.insertUserType({
    name,
    slug: slugify(name),
    description: source.description,
    tone: source.tone,
    permissions: parseJson(source.permissions, [])
  });

  res.status(201).json(mapUserType(await adminModel.findUserTypeById(id)));
};

const updateUserType = async (req, res) => {
  const existing = await adminModel.findUserTypeById(req.params.id);
  if (!existing) return notFound(res, "That user type does not exist.");

  const name = req.body.name === undefined ? existing.name : text(req.body.name).slice(0, 50);
  if (!name) return badRequest(res, "A user type name is required.");

  if (existing.is_system && name !== existing.name) return badRequest(res, "System user types cannot be renamed.");
  if (existing.permissions_locked && req.body.permissions !== undefined) {
    return badRequest(res, `${existing.name} permissions are fixed and cannot be changed.`);
  }
  if (name !== existing.name && (await adminModel.userTypeNameExists(name, existing.id))) {
    return badRequest(res, "A user type with that name already exists.");
  }

  await adminModel.updateUserType(existing.id, {
    name,
    slug: existing.is_system ? existing.slug : slugify(name),
    description: req.body.description === undefined ? existing.description : text(req.body.description).slice(0, 255) || null,
    tone: tone(req.body.tone, existing.tone),
    permissions: req.body.permissions === undefined ? parseJson(existing.permissions, []) : permissionList(req.body.permissions)
  });

  res.json(mapUserType(await adminModel.findUserTypeById(existing.id)));
};

const deleteUserType = async (req, res) => {
  const existing = await adminModel.findUserTypeById(req.params.id);
  if (!existing) return notFound(res, "That user type does not exist.");
  if (existing.is_system) return badRequest(res, "System user types cannot be deleted.");
  if (existing.member_count > 0) return badRequest(res, "Reassign the people on this user type before deleting it.");

  await adminModel.deleteUserType(existing.id);
  res.json({ id: existing.id });
};

const getFeatures = async (req, res) => {
  res.json(await adminModel.findFeatures());
};

const setFeature = async (req, res) => {
  const feature = FEATURES.find((item) => item.key === req.params.key);
  if (!feature) return notFound(res, "That feature does not exist.");

  const enabled = Boolean(req.body.enabled);
  if (feature.locked && !enabled) return badRequest(res, `${feature.name} cannot be turned off.`);

  await adminModel.setFeature(feature.key, enabled);
  res.json(await adminModel.findFeatures());
};

const getAutomations = async (req, res) => {
  const state = await adminModel.findAutomationRules();
  res.json(AUTOMATION_RULES.map((rule) => ({ ...rule, enabled: state[rule.id] !== false })));
};

const setAutomation = async (req, res) => {
  const rule = AUTOMATION_RULES.find((item) => item.id === req.params.id);
  if (!rule) return notFound(res, "That automation does not exist.");

  await adminModel.setAutomationRule(rule.id, Boolean(req.body.enabled));
  res.json(await adminModel.findAutomationRules());
};

module.exports = {
  listUserTypes,
  listUserTypeMembers,
  createUserType,
  duplicateUserType,
  updateUserType,
  deleteUserType,
  getFeatures,
  setFeature,
  getAutomations,
  setAutomation
};
