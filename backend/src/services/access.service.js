const accessModel = require("../models/access.model");
const workspaceModel = require("../models/workspace.model");
const { USER_TYPE } = require("../constants/workspace");

const LEVEL_RANK = { none: 0, view: 1, edit: 2 };

const isMasterAdmin = (req) => req.user.userTypeId === USER_TYPE.MASTER_ADMIN;

const allowedWorkspaceIds = async (req) =>
  isMasterAdmin(req) ? null : workspaceModel.findWorkspaceIdsForEmployee(req.user.employeeId);

const inScope = (allowed, workspaceId) => allowed === null || (Boolean(workspaceId) && allowed.includes(workspaceId));

const permissionsOf = (userType) => {
  if (Array.isArray(userType.permissions)) return userType.permissions;
  try {
    return JSON.parse(userType.permissions || "[]");
  } catch {
    return [];
  }
};

const assignableUserTypes = (req, userTypes) => {
  if (isMasterAdmin(req)) return userTypes;
  const granted = req.permissions || [];
  return userTypes.filter(
    (userType) => userType.id !== USER_TYPE.MASTER_ADMIN && permissionsOf(userType).every((key) => granted.includes(key))
  );
};

const resolveScopes = async (req, workspaceId) => {
  if (req.user.userTypeId === USER_TYPE.MASTER_ADMIN || (await accessModel.isWorkspaceAdmin(workspaceId, req.user.employeeId))) {
    return { admin: true, workspace: "edit", groups: new Map(), teams: new Map(), employeeId: req.user.employeeId };
  }

  const grants = await accessModel.findGrants(workspaceId, req.user.employeeId);
  const scopes = { admin: false, workspace: "none", groups: new Map(), teams: new Map(), employeeId: req.user.employeeId };
  grants.forEach((grant) => {
    if (grant.scope_type === "workspace") scopes.workspace = grant.level;
    if (grant.scope_type === "group") scopes.groups.set(grant.scope_id, grant.level);
    if (grant.scope_type === "team") scopes.teams.set(grant.scope_id, grant.level);
  });
  return scopes;
};

const levelForTask = (scopes, task, teamGroupMap = null) => {
  if (scopes.admin) return "edit";
  const assigned = (task.assigneeIds ?? []).includes(scopes.employeeId);
  const groupId = task.groupId ?? (teamGroupMap && task.teamId ? teamGroupMap.get(task.teamId) : null);

  let level = scopes.workspace;
  if (groupId && scopes.groups.has(groupId)) level = scopes.groups.get(groupId);
  if (task.teamId && scopes.teams.has(task.teamId)) level = scopes.teams.get(task.teamId);
  if (assigned && LEVEL_RANK[level] < LEVEL_RANK.edit) level = "edit";
  return level;
};

const canEditTask = (scopes, task) => levelForTask(scopes, task) === "edit";
const canViewTask = (scopes, task) => LEVEL_RANK[levelForTask(scopes, task)] >= LEVEL_RANK.view;

const levelForGroup = (scopes, groupId) => {
  if (scopes.admin) return "edit";
  if (scopes.groups.has(groupId)) return scopes.groups.get(groupId);
  return scopes.workspace;
};

const levelForTeam = (scopes, teamId, groupId) => {
  if (scopes.admin) return "edit";
  if (scopes.teams.has(teamId)) return scopes.teams.get(teamId);
  return levelForGroup(scopes, groupId);
};

const visibilityFilter = (scopes) => {
  if (scopes.admin || scopes.workspace !== "none") return null;
  return {
    employeeId: scopes.employeeId,
    groupIds: [...scopes.groups.keys()],
    teamIds: [...scopes.teams.keys()]
  };
};

module.exports = {
  LEVEL_RANK,
  isMasterAdmin,
  allowedWorkspaceIds,
  inScope,
  assignableUserTypes,
  resolveScopes,
  levelForTask,
  canEditTask,
  canViewTask,
  levelForGroup,
  levelForTeam,
  visibilityFilter
};
