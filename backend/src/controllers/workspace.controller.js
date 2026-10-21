const workspaceModel = require("../models/workspace.model");
const accessModel = require("../models/access.model");
const accountModel = require("../models/account.model");
const access = require("../services/access.service");
const { nextId } = require("../utils/ids");
const { withTransaction } = require("../utils/transaction");
const { DEFAULT_STATUS_TEMPLATES, LIMITS, STATUS_KINDS, TONES, USER_TYPE } = require("../constants/workspace");

const text = (value) => (typeof value === "string" ? value.trim() : "");
const idList = (value) => (Array.isArray(value) ? [...new Set(value.map(text).filter(Boolean))] : []);
const tone = (value, fallback) => (TONES.includes(value) ? value : fallback);
const REQUIRED_KINDS = { todo: "To Do", completed: "Completed" };

const isMasterAdmin = (req) => req.user.userTypeId === USER_TYPE.MASTER_ADMIN;

const badRequest = (res, message, errors) =>
  res.status(400).json({ message, code: errors ? "VALIDATION_ERROR" : "BAD_REQUEST", ...(errors && { errors }) });
const limitReached = (res, message) => res.status(409).json({ message, code: "LIMIT_REACHED" });

const notFound = (res, message) => res.status(404).json({ message, code: "NOT_FOUND" });

const forbidden = (res) =>
  res.status(403).json({ message: "You do not have access to this workspace.", code: "FORBIDDEN" });

const employeeAdminError = async (res, adminIds) => {
  const employees = await accountModel.findLoginsOfType(adminIds, USER_TYPE.EMPLOYEE);
  if (employees.length === 0) return false;
  const list = employees.map((row) => row.full_name).join(", ");
  badRequest(res, `${list} ${employees.length === 1 ? "has" : "have"} the Employee user type, and Employees cannot be workspace admins. Change their user type in Access › Accounts first.`, {
    adminIds: "Employees cannot be workspace admins."
  });
  return true;
};

const mapWorkspace = (row, adminIds = []) => ({
  id: row.id,
  name: row.name,
  shortName: row.short_name,
  description: row.description ?? "",
  tone: row.tone,
  fiscalYearStartMonth: row.fiscal_year_start_month ?? 4,
  ownerId: row.owner_id,
  adminIds,
  createdAt: row.created_at,
  groupCount: row.group_count,
  memberCount: row.member_count,
  taskCount: row.task_count,
  openTaskCount: row.open_task_count
});

const mapGroup = (row) => ({
  id: row.id,
  workspaceId: row.workspace_id,
  name: row.name,
  tone: row.tone,
  leadId: row.lead_id,
  leadName: row.lead_name ?? "—"
});

const mapTeam = (row, memberIds = []) => ({
  id: row.id,
  groupId: row.group_id,
  name: row.name,
  leadId: row.lead_id,
  leadName: row.lead_name ?? "—",
  memberIds
});

const mapColumn = (row) => ({
  id: row.id,
  workspaceId: row.workspace_id,
  name: row.name,
  kind: row.kind,
  tone: row.tone,
  order: row.sort_order,
  wipLimit: row.wip_limit,
  isDefault: Boolean(row.is_default)
});

const mapMember = (row) => ({
  employeeId: row.employee_id,
  fullName: row.full_name,
  designation: row.designation,
  department: row.department,
  userTypeId: row.user_type_id,
  userTypeName: row.user_type_name,
  groupId: row.group_id,
  teamId: row.team_id
});

const mapGrants = (grants = []) => ({
  workspace: grants.find((grant) => grant.scope_type === "workspace")?.level ?? null,
  groups: Object.fromEntries(grants.filter((grant) => grant.scope_type === "group").map((grant) => [grant.scope_id, grant.level])),
  teams: Object.fromEntries(grants.filter((grant) => grant.scope_type === "team").map((grant) => [grant.scope_id, grant.level]))
});

const loadAccessibleWorkspace = async (req, res, workspaceId) => {
  const workspace = await workspaceModel.findWorkspaceById(workspaceId);
  if (!workspace) {
    notFound(res, "That workspace does not exist.");
    return null;
  }
  if (!isMasterAdmin(req) && !(await workspaceModel.isMember(workspaceId, req.user.employeeId))) {
    forbidden(res);
    return null;
  }
  return workspace;
};

const listWorkspaces = async (req, res) => {
  const rows = isMasterAdmin(req)
    ? await workspaceModel.findAllWorkspaces()
    : await workspaceModel.findWorkspacesForEmployee(req.user.employeeId);

  const adminsByWorkspace = await workspaceModel.findAdminIdsByWorkspace(rows.map((row) => row.id));
  res.json(rows.map((row) => mapWorkspace(row, adminsByWorkspace.get(row.id) ?? [])));
};

const getWorkspace = async (req, res) => {
  const workspace = await loadAccessibleWorkspace(req, res, req.params.workspaceId);
  if (!workspace) return;

  res.json(mapWorkspace(workspace, await workspaceModel.findAdminIds(workspace.id)));
};

const createWorkspace = async (req, res) => {
  if ((await workspaceModel.countWorkspaces()) >= LIMITS.WORKSPACES) {
    return limitReached(res, `You can have up to ${LIMITS.WORKSPACES} workspaces. Delete one you no longer use before creating another.`);
  }

  const name = text(req.body.name);
  if (!name) return badRequest(res, "A workspace name is required.", { name: "Workspace name is required." });

  const fiscalYearStartMonth = req.body.fiscalYearStartMonth === undefined ? 4 : Number(req.body.fiscalYearStartMonth);
  if (!Number.isInteger(fiscalYearStartMonth) || fiscalYearStartMonth < 1 || fiscalYearStartMonth > 12) {
    return badRequest(res, "Choose a month between January and December.", { fiscalYearStartMonth: "Choose a start month." });
  }

  const adminIds = idList(req.body.adminIds);
  if (adminIds.length === 0) {
    return badRequest(res, "Every workspace needs at least one admin.", { adminIds: "Choose at least one workspace admin." });
  }
  if (!(await workspaceModel.employeesExist(adminIds))) {
    return badRequest(res, "One of the selected admins does not exist.", { adminIds: "Unknown employee." });
  }
  if (await employeeAdminError(res, adminIds)) return;

  const workspaceId = await withTransaction(async (connection) => {
    const id = await nextId("WS", connection);

    await workspaceModel.insertWorkspace(
      {
        id,
        name,
        shortName: text(req.body.shortName).slice(0, 10) || name.slice(0, 3).toUpperCase(),
        description: text(req.body.description) || null,
        tone: tone(req.body.tone, "blue"),
        fiscalYearStartMonth,
        ownerId: req.user.employeeId
      },
      connection
    );

    await workspaceModel.replaceAdmins(id, adminIds, connection);

    await workspaceModel.upsertMember(
      { workspaceId: id, employeeId: req.user.employeeId, userTypeId: req.user.userTypeId },
      connection
    );
    for (const employeeId of adminIds) {
      await workspaceModel.upsertMember({ workspaceId: id, employeeId, userTypeId: USER_TYPE.ADMIN }, connection);
    }

    const presets = DEFAULT_STATUS_TEMPLATES.filter((template) => template.preset);
    for (const [index, template] of presets.entries()) {
      await workspaceModel.insertColumn(
        {
          id: await nextId("COL", connection),
          workspaceId: id,
          name: template.name,
          kind: template.kind,
          tone: template.tone,
          order: index,
          wipLimit: null,
          isDefault: true
        },
        connection
      );
    }

    return id;
  });

  const created = await workspaceModel.findWorkspaceById(workspaceId);
  await refreshRoomsFrom(req, [req.user.employeeId, ...adminIds]);
  res.status(201).json(mapWorkspace(created, adminIds));
};

const updateWorkspace = async (req, res) => {
  const workspace = await loadAccessibleWorkspace(req, res, req.params.workspaceId);
  if (!workspace) return;

  const name = req.body.name === undefined ? workspace.name : text(req.body.name);
  if (!name) return badRequest(res, "A workspace name is required.", { name: "Workspace name is required." });

  const fiscalYearStartMonth =
    req.body.fiscalYearStartMonth === undefined ? workspace.fiscal_year_start_month : Number(req.body.fiscalYearStartMonth);
  if (!Number.isInteger(fiscalYearStartMonth) || fiscalYearStartMonth < 1 || fiscalYearStartMonth > 12) {
    return badRequest(res, "Choose a month between January and December.", { fiscalYearStartMonth: "Choose a start month." });
  }

  const adminIds = req.body.adminIds === undefined ? null : idList(req.body.adminIds);
  if (adminIds && adminIds.length === 0) {
    return badRequest(res, "Every workspace needs at least one admin.", { adminIds: "Choose at least one workspace admin." });
  }
  if (adminIds && !(await workspaceModel.employeesExist(adminIds))) {
    return badRequest(res, "One of the selected admins does not exist.", { adminIds: "Unknown employee." });
  }
  if (adminIds) {
    const current = await workspaceModel.findAdminIds(workspace.id);
    if (await employeeAdminError(res, adminIds.filter((employeeId) => !current.includes(employeeId)))) return;
  }

  await withTransaction(async (connection) => {
    await workspaceModel.updateWorkspace(
      workspace.id,
      {
        name,
        shortName:
          req.body.shortName === undefined ? workspace.short_name : text(req.body.shortName).slice(0, 10) || workspace.short_name,
        description: req.body.description === undefined ? workspace.description : text(req.body.description) || null,
        tone: tone(req.body.tone, workspace.tone),
        fiscalYearStartMonth
      },
      connection
    );

    if (adminIds) {
      await workspaceModel.replaceAdmins(workspace.id, adminIds, connection);
      for (const employeeId of adminIds) {
        await workspaceModel.upsertMember(
          { workspaceId: workspace.id, employeeId, userTypeId: USER_TYPE.ADMIN },
          connection
        );
      }
    }
  });

  const updated = await workspaceModel.findWorkspaceById(workspace.id);
  const admins = await workspaceModel.findAdminIds(workspace.id);
  broadcast(req, workspace.id, "workspace", "updated");
  await refreshRoomsFrom(req, admins);
  res.json(mapWorkspace(updated, admins));
};

const deleteWorkspace = async (req, res) => {
  const workspace = await loadAccessibleWorkspace(req, res, req.params.workspaceId);
  if (!workspace) return;

  await withTransaction((connection) => workspaceModel.deleteWorkspace(workspace.id, connection));
  broadcast(req, workspace.id, "workspace", "deleted");
  res.json({ id: workspace.id });
};

const getStructure = async (req, res) => {
  const workspace = await loadAccessibleWorkspace(req, res, req.params.workspaceId);
  if (!workspace) return;

  const [groups, teams, teamMembers, members, scopes, grantsByMember] = await Promise.all([
    workspaceModel.findGroups(workspace.id),
    workspaceModel.findTeamsByWorkspace(workspace.id),
    workspaceModel.findTeamMembersByWorkspace(workspace.id),
    workspaceModel.findMembers(workspace.id),
    access.resolveScopes(req, workspace.id),
    accessModel.findGrantsForWorkspace(workspace.id)
  ]);

  const membersByTeam = new Map();
  teamMembers.forEach((row) => {
    if (!membersByTeam.has(row.team_id)) membersByTeam.set(row.team_id, []);
    membersByTeam.get(row.team_id).push({ id: row.employee_id, fullName: row.full_name });
  });

  const visibleGroups = groups
    .map((group) => {
      const groupLevel = access.levelForGroup(scopes, group.id);
      const visibleTeams = teams
        .filter((team) => team.group_id === group.id)
        .map((team) => ({ team, level: access.levelForTeam(scopes, team.id, group.id) }))
        .filter(({ level }) => level !== "none");
      if (groupLevel === "none" && visibleTeams.length === 0) return null;
      return {
        ...mapGroup(group),
        access: groupLevel,
        teams: visibleTeams.map(({ team, level }) => {
          const teamMemberList = membersByTeam.get(team.id) ?? [];
          return {
            ...mapTeam(team, teamMemberList.map((member) => member.id)),
            access: level,
            members: teamMemberList
          };
        })
      };
    })
    .filter(Boolean);

  res.json({
    access: { admin: scopes.admin, workspace: scopes.admin ? "edit" : scopes.workspace },
    groups: visibleGroups,
    members: members.map((member) => ({ ...mapMember(member), grants: mapGrants(grantsByMember.get(member.employee_id)) }))
  });
};

const createGroup = async (req, res) => {
  const workspace = await loadAccessibleWorkspace(req, res, req.params.workspaceId);
  if (!workspace) return;
  if ((await workspaceModel.countGroups(workspace.id)) >= LIMITS.GROUPS_PER_WORKSPACE) {
    return limitReached(res, `A workspace can have up to ${LIMITS.GROUPS_PER_WORKSPACE} groups. Remove or merge one before adding another.`);
  }

  const name = text(req.body.name);
  if (!name) return badRequest(res, "A group name is required.", { name: "Group name is required." });

  const leadId = text(req.body.leadId) || null;
  if (leadId && !(await workspaceModel.employeesExist([leadId]))) {
    return badRequest(res, "That group lead does not exist.", { leadId: "Unknown employee." });
  }

  const id = await nextId("GRP");
  await workspaceModel.insertGroup({ id, workspaceId: workspace.id, name, tone: tone(req.body.tone, "blue"), leadId });

  if (leadId) {
    await workspaceModel.upsertMember({
      workspaceId: workspace.id,
      employeeId: leadId,
      userTypeId: USER_TYPE.TEAM_LEAD,
      groupId: id
    });
    await accessModel.grantIfMissing({ workspaceId: workspace.id, employeeId: leadId, scopeType: "group", scopeId: id, level: "edit" });
  }

  broadcast(req, workspace.id, "structure", "created");
  res.status(201).json(mapGroup(await workspaceModel.findGroupById(id)));
};

const updateGroup = async (req, res) => {
  const group = await workspaceModel.findGroupById(req.params.groupId);
  if (!group) return notFound(res, "That group does not exist.");
  if (!(await loadAccessibleWorkspace(req, res, group.workspace_id))) return;

  const name = req.body.name === undefined ? group.name : text(req.body.name);
  if (!name) return badRequest(res, "A group name is required.", { name: "Group name is required." });

  const leadId = req.body.leadId === undefined ? group.lead_id : text(req.body.leadId) || null;
  if (leadId && !(await workspaceModel.employeesExist([leadId]))) {
    return badRequest(res, "That group lead does not exist.", { leadId: "Unknown employee." });
  }

  await workspaceModel.updateGroup(group.id, { name, tone: tone(req.body.tone, group.tone), leadId });

  if (leadId) {
    await workspaceModel.upsertMember({
      workspaceId: group.workspace_id,
      employeeId: leadId,
      userTypeId: USER_TYPE.TEAM_LEAD,
      groupId: group.id
    });
    await accessModel.grantIfMissing({ workspaceId: group.workspace_id, employeeId: leadId, scopeType: "group", scopeId: group.id, level: "edit" });
  }

  broadcast(req, group.workspace_id, "structure", "updated");
  res.json(mapGroup(await workspaceModel.findGroupById(group.id)));
};

const deleteGroup = async (req, res) => {
  const group = await workspaceModel.findGroupById(req.params.groupId);
  if (!group) return notFound(res, "That group does not exist.");
  if (!(await loadAccessibleWorkspace(req, res, group.workspace_id))) return;

  if ((await workspaceModel.countTasksInGroup(group.id)) > 0) {
    return badRequest(res, "This group still has tasks. Move or delete them before removing the group.");
  }

  await workspaceModel.deleteGroup(group.id);
  broadcast(req, group.workspace_id, "structure", "deleted");
  res.json({ id: group.id });
};

const saveTeam = async (req, res, { group, existing }) => {
  const name = req.body.name === undefined ? existing?.name : text(req.body.name);
  if (!name) return badRequest(res, "A team name is required.", { name: "Team name is required." });

  const leadId = req.body.leadId === undefined ? (existing?.lead_id ?? null) : text(req.body.leadId) || null;
  const memberIds =
    req.body.memberIds === undefined
      ? await workspaceModel.findTeamMemberIds(existing?.id ?? "")
      : idList(req.body.memberIds);

  if (!(await workspaceModel.employeesExist([...memberIds, ...(leadId ? [leadId] : [])]))) {
    return badRequest(res, "One of the selected people does not exist.", { memberIds: "Unknown employee." });
  }

  const teamId = await withTransaction(async (connection) => {
    const id = existing ? existing.id : await nextId("TEAM", connection);

    if (existing) {
      await workspaceModel.updateTeam(id, { name, leadId }, connection);
    } else {
      await workspaceModel.insertTeam({ id, groupId: group.id, name, leadId }, connection);
    }

    await workspaceModel.replaceTeamMembers(
      id,
      [...new Set([...memberIds, ...(leadId ? [leadId] : [])])],
      connection
    );

    if (leadId) {
      await workspaceModel.upsertMember(
        { workspaceId: group.workspace_id, employeeId: leadId, userTypeId: USER_TYPE.TEAM_LEAD, groupId: group.id, teamId: id },
        connection
      );
      await accessModel.grantIfMissing({ workspaceId: group.workspace_id, employeeId: leadId, scopeType: "team", scopeId: id, level: "edit" }, connection);
    }
    for (const employeeId of memberIds) {
      await workspaceModel.upsertMember(
        { workspaceId: group.workspace_id, employeeId, userTypeId: USER_TYPE.EMPLOYEE, groupId: group.id, teamId: id },
        connection
      );
      await accessModel.grantIfMissing({ workspaceId: group.workspace_id, employeeId, scopeType: "team", scopeId: id, level: "edit" }, connection);
    }

    return id;
  });

  const saved = await workspaceModel.findTeamById(teamId);
  broadcast(req, group.workspace_id, "structure", existing ? "updated" : "created");
  await refreshRoomsFrom(req, [...memberIds, leadId]);
  return res.status(existing ? 200 : 201).json(mapTeam(saved, await workspaceModel.findTeamMemberIds(teamId)));
};

const createTeam = async (req, res) => {
  const group = await workspaceModel.findGroupById(req.params.groupId);
  if (!group) return notFound(res, "That group does not exist.");
  if (!(await loadAccessibleWorkspace(req, res, group.workspace_id))) return;

  return saveTeam(req, res, { group, existing: null });
};

const updateTeam = async (req, res) => {
  const team = await workspaceModel.findTeamById(req.params.teamId);
  if (!team) return notFound(res, "That team does not exist.");
  if (!(await loadAccessibleWorkspace(req, res, team.workspace_id))) return;

  const group = await workspaceModel.findGroupById(team.group_id);
  return saveTeam(req, res, { group, existing: team });
};

const deleteTeam = async (req, res) => {
  const team = await workspaceModel.findTeamById(req.params.teamId);
  if (!team) return notFound(res, "That team does not exist.");
  if (!(await loadAccessibleWorkspace(req, res, team.workspace_id))) return;

  await workspaceModel.deleteTeam(team.id);
  broadcast(req, team.workspace_id, "structure", "deleted");
  res.json({ id: team.id });
};

const listColumns = async (req, res) => {
  const workspace = await loadAccessibleWorkspace(req, res, req.params.workspaceId);
  if (!workspace) return;

  res.json((await workspaceModel.findColumns(workspace.id)).map(mapColumn));
};

const createColumns = async (req, res) => {
  const workspace = await loadAccessibleWorkspace(req, res, req.params.workspaceId);
  if (!workspace) return;

  const entries = Array.isArray(req.body) ? req.body : req.body.entries;
  if (!Array.isArray(entries) || entries.length === 0) {
    return badRequest(res, "Select at least one group to add.");
  }

  const invalid = entries.find((entry) => !text(entry?.name) || !STATUS_KINDS.includes(entry?.kind));
  if (invalid) return badRequest(res, "Each column needs a name and a valid kind.");

  const existing = await workspaceModel.findColumns(workspace.id);
  let order = existing.length;

  const ids = await withTransaction(async (connection) => {
    const created = [];
    for (const entry of entries) {
      const id = await nextId("COL", connection);
      await workspaceModel.insertColumn(
        {
          id,
          workspaceId: workspace.id,
          name: text(entry.name).slice(0, 60),
          kind: entry.kind,
          tone: tone(entry.tone, "slate"),
          order: order++,
          wipLimit: Number.isInteger(entry.wipLimit) && entry.wipLimit > 0 ? entry.wipLimit : null,
          isDefault: Boolean(entry.isDefault)
        },
        connection
      );
      created.push(id);
    }
    return created;
  });

  const columns = await workspaceModel.findColumns(workspace.id);
  broadcast(req, workspace.id, "columns", "created");
  res.status(201).json(columns.filter((column) => ids.includes(column.id)).map(mapColumn));
};

const updateColumn = async (req, res) => {
  const column = await workspaceModel.findColumnById(req.params.columnId);
  if (!column) return notFound(res, "That column does not exist.");
  if (!(await loadAccessibleWorkspace(req, res, column.workspace_id))) return;

  const name = req.body.name === undefined ? column.name : text(req.body.name).slice(0, 60);
  if (!name) return badRequest(res, "A column name is required.", { name: "Column name is required." });

  const wipLimit =
    req.body.wipLimit === undefined
      ? column.wip_limit
      : Number.isInteger(req.body.wipLimit) && req.body.wipLimit > 0
        ? req.body.wipLimit
        : null;

  await workspaceModel.updateColumn(column.id, {
    name,
    tone: tone(req.body.tone, column.tone),
    order: Number.isInteger(req.body.order) ? req.body.order : column.sort_order,
    wipLimit
  });

  broadcast(req, column.workspace_id, "columns", "updated");
  res.json(mapColumn(await workspaceModel.findColumnById(column.id)));
};

const deleteColumn = async (req, res) => {
  const column = await workspaceModel.findColumnById(req.params.columnId);
  if (!column) return notFound(res, "That column does not exist.");
  if (!(await loadAccessibleWorkspace(req, res, column.workspace_id))) return;

  const required = REQUIRED_KINDS[column.kind];
  if (required) {
    const columns = await workspaceModel.findColumns(column.workspace_id);
    if (!columns.some((other) => other.id !== column.id && other.kind === column.kind)) {
      return badRequest(res, `The board needs a ${required} group, so "${column.name}" cannot be removed.`);
    }
  }

  const taskCount = await workspaceModel.countTasksInColumn(column.id);
  if (taskCount > 0) {
    return badRequest(
      res,
      `"${column.name}" still holds ${taskCount} task${taskCount === 1 ? "" : "s"}, including any hidden by filters or the selected month. Move them to another group first.`
    );
  }

  await workspaceModel.deleteColumn(column.id);
  broadcast(req, column.workspace_id, "columns", "deleted");
  res.json({ id: column.id });
};

const addMember = async (req, res) => {
  const workspace = await loadAccessibleWorkspace(req, res, req.params.workspaceId);
  if (!workspace) return;

  const employeeId = text(req.body.employeeId);
  if (!employeeId || !(await workspaceModel.employeesExist([employeeId]))) {
    return badRequest(res, "Choose a valid employee.", { employeeId: "Unknown employee." });
  }

  const userTypeId = Number.isInteger(req.body.userTypeId) ? req.body.userTypeId : USER_TYPE.EMPLOYEE;

  await workspaceModel.upsertMember({
    workspaceId: workspace.id,
    employeeId,
    userTypeId,
    groupId: text(req.body.groupId) || null,
    teamId: text(req.body.teamId) || null
  });

  const members = await workspaceModel.findMembers(workspace.id);
  broadcast(req, workspace.id, "members", "added");
  await refreshRoomsFrom(req, [employeeId]);
  res.status(201).json(mapMember(members.find((member) => member.employee_id === employeeId)));
};

const LEVELS = ["view", "edit"];

const updateMemberAccess = async (req, res) => {
  const workspace = await loadAccessibleWorkspace(req, res, req.params.workspaceId);
  if (!workspace) return;

  const { employeeId } = req.params;
  const members = await workspaceModel.findMembers(workspace.id);
  if (!members.some((member) => member.employee_id === employeeId)) {
    return notFound(res, "That person is not a member of this workspace.");
  }

  const [groups, teams] = await Promise.all([workspaceModel.findGroups(workspace.id), workspaceModel.findTeamsByWorkspace(workspace.id)]);
  const groupIds = new Set(groups.map((group) => group.id));
  const teamIds = new Set(teams.map((team) => team.id));

  const grants = [];
  const workspaceLevel = req.body.workspace ?? null;
  if (workspaceLevel !== null && !LEVELS.includes(workspaceLevel)) return badRequest(res, "Workspace access must be view or edit.");
  if (workspaceLevel) grants.push({ scopeType: "workspace", scopeId: "", level: workspaceLevel });

  for (const [groupId, level] of Object.entries(req.body.groups ?? {})) {
    if (!level) continue;
    if (!groupIds.has(groupId)) return badRequest(res, "One of the groups does not belong to this workspace.");
    if (!LEVELS.includes(level)) return badRequest(res, "Group access must be view or edit.");
    grants.push({ scopeType: "group", scopeId: groupId, level });
  }
  for (const [teamId, level] of Object.entries(req.body.teams ?? {})) {
    if (!level) continue;
    if (!teamIds.has(teamId)) return badRequest(res, "One of the teams does not belong to this workspace.");
    if (!LEVELS.includes(level)) return badRequest(res, "Team access must be view or edit.");
    grants.push({ scopeType: "team", scopeId: teamId, level });
  }

  await accessModel.replaceGrants(workspace.id, employeeId, grants);

  const member = (await workspaceModel.findMembers(workspace.id)).find((row) => row.employee_id === employeeId);
  broadcast(req, workspace.id, "members", "updated");
  await refreshRoomsFrom(req, [employeeId]);
  res.json({ ...mapMember(member), grants: mapGrants(await accessModel.findGrants(workspace.id, employeeId)) });
};

const removeMember = async (req, res) => {
  const workspace = await loadAccessibleWorkspace(req, res, req.params.workspaceId);
  if (!workspace) return;

  if (req.params.employeeId === workspace.owner_id) {
    return badRequest(res, "The workspace owner cannot be removed.");
  }

  await workspaceModel.removeMember(workspace.id, req.params.employeeId);
  broadcast(req, workspace.id, "members", "removed");
  await refreshRoomsFrom(req, [req.params.employeeId]);
  res.status(204).end();
};

module.exports = {
  listWorkspaces,
  getWorkspace,
  createWorkspace,
  updateWorkspace,
  deleteWorkspace,
  getStructure,
  createGroup,
  updateGroup,
  deleteGroup,
  createTeam,
  updateTeam,
  deleteTeam,
  listColumns,
  createColumns,
  updateColumn,
  deleteColumn,
  addMember,
  updateMemberAccess,
  removeMember
};
