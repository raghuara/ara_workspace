const dashboardModel = require("../models/dashboard.model");
const workspaceModel = require("../models/workspace.model");
const access = require("../services/access.service");
const { buildTrackerWorkbook } = require("../services/trackerExport.service");
const { periodFrom, belongsToPeriod } = require("../utils/period");
const { PRIORITIES, USER_TYPE } = require("../constants/workspace");

const PRIORITY_TONES = { Urgent: "rose", High: "amber", Normal: "blue", Low: "gray" };

const today = () => new Date().toISOString().slice(0, 10);
const rate = (part, whole) => (whole ? Math.round((part / whole) * 100) : 0);

const notFound = (res, message) => res.status(404).json({ message, code: "NOT_FOUND" });
const forbidden = (res) => res.status(403).json({ message: "You do not have access to this workspace.", code: "FORBIDDEN" });

const buildAnalyser = (snapshot, directory) => {
  const columnById = new Map(snapshot.columns.map((column) => [column.id, column]));
  const clientById = new Map(snapshot.clients.map((client) => [client.id, client]));
  const correctionMoves = snapshot.correctionMoveTaskIds;

  const kindOf = (task) => columnById.get(task.statusId)?.kind ?? "custom";
  const person = (employeeId) => (employeeId && directory.get(employeeId)) || null;

  const metricsFor = (tasks) => {
    const now = today();
    const ids = new Set(tasks.map((task) => task.id));
    const open = tasks.filter((task) => kindOf(task) !== "completed");
    const completed = tasks.filter((task) => kindOf(task) === "completed");
    const moves = correctionMoves.filter((taskId) => ids.has(taskId)).length;

    return {
      tasks: tasks.length,
      open: open.length,
      completed: completed.length,
      inCorrection: tasks.filter((task) => kindOf(task) === "correction").length,
      correctionMoves: moves,
      overdue: open.filter((task) => task.dueDate && task.dueDate < now).length,
      dueToday: open.filter((task) => task.dueDate === now).length,
      points: tasks.reduce((sum, task) => sum + task.points, 0),
      completedPoints: completed.reduce((sum, task) => sum + task.points, 0),
      completionRate: rate(completed.length, tasks.length),
      correctionRate: rate(moves, tasks.length)
    };
  };

  const statusBreakdown = (tasks) =>
    snapshot.columns.map((column) => {
      const inColumn = tasks.filter((task) => task.statusId === column.id);
      return {
        id: column.id,
        name: column.name,
        kind: column.kind,
        tone: column.tone,
        count: inColumn.length,
        points: inColumn.reduce((sum, task) => sum + task.points, 0)
      };
    });

  const clientBreakdown = (tasks) =>
    Object.values(
      tasks.reduce((acc, task) => {
        const client = clientById.get(task.clientId);
        const key = task.clientId ?? "none";
        acc[key] ??= { id: key, name: client?.name ?? "Unassigned", tone: client?.tone ?? "slate", count: 0, open: 0 };
        acc[key].count += 1;
        if (kindOf(task) !== "completed") acc[key].open += 1;
        return acc;
      }, {})
    ).sort((a, b) => b.count - a.count);

  const priorityBreakdown = (tasks) =>
    PRIORITIES.map((priority) => ({
      label: priority,
      tone: PRIORITY_TONES[priority],
      value: tasks.filter((task) => task.priority === priority && kindOf(task) !== "completed").length
    }));

  const teamSummary = (team, group, tasks) => {
    const teamTasks = tasks.filter((task) => task.teamId === team.id);
    const metrics = metricsFor(teamTasks);
    return {
      id: team.id,
      name: team.name,
      groupId: group.id,
      groupName: group.name,
      groupTone: group.tone,
      leadId: team.leadId,
      leadName: person(team.leadId)?.fullName ?? "—",
      members: team.memberIds.length,
      workers: team.memberIds.filter((id) => !(team.supervisorIds ?? []).includes(id) && id !== team.leadId).length,
      assigned: metrics.tasks,
      ...metrics
    };
  };

  const groupSummary = (group, tasks) => {
    const teams = snapshot.teams.filter((team) => team.groupId === group.id);
    const groupTasks = tasks.filter((task) => task.groupId === group.id);
    const people = new Set(teams.flatMap((team) => [team.leadId, ...team.memberIds]).filter(Boolean));
    return {
      id: group.id,
      name: group.name,
      tone: group.tone,
      leadId: group.leadId,
      leadName: person(group.leadId)?.fullName ?? "—",
      teams: teams.length,
      members: people.size,
      ...metricsFor(groupTasks)
    };
  };

  const memberRow = (employeeId, role, tasks, teamName = null) => {
    const mine = tasks.filter((task) => task.assigneeIds.includes(employeeId));
    const metrics = metricsFor(mine);
    return {
      ...(person(employeeId) ?? { id: employeeId, fullName: "Unknown", designation: "—", department: "—" }),
      role,
      teamName,
      open: metrics.open,
      completed: metrics.completed,
      overdue: metrics.overdue,
      points: metrics.points,
      completedPoints: metrics.completedPoints
    };
  };

  return { kindOf, person, metricsFor, statusBreakdown, clientBreakdown, priorityBreakdown, teamSummary, groupSummary, memberRow };
};

const summariseWorkspace = (snapshot, directory) => {
  const a = buildAnalyser(snapshot, directory);
  const { workspace, tasks, members, groups } = snapshot;
  const teams = groups.flatMap((group) =>
    snapshot.teams.filter((team) => team.groupId === group.id).map((team) => a.teamSummary(team, group, tasks))
  );

  return {
    id: workspace.id,
    name: workspace.name,
    shortName: workspace.shortName,
    description: workspace.description,
    tone: workspace.tone,
    adminNames: workspace.adminIds.map((id) => a.person(id)?.fullName).filter(Boolean),
    members: members.length,
    groups: groups.length,
    teams: teams.length,
    ...a.metricsFor(tasks),
    byStatus: a.statusBreakdown(tasks),
    byTeam: teams.sort((x, y) => y.assigned - x.assigned),
    byClient: a.clientBreakdown(tasks).slice(0, 6)
  };
};

const summariseScope = (snapshot, directory, { groupId, teamId }) => {
  const a = buildAnalyser(snapshot, directory);
  const { workspace, groups, tasks: workspaceTasks } = snapshot;

  const team = teamId ? snapshot.teams.find((candidate) => candidate.id === teamId) : null;
  if (teamId && !team) return { error: "That team does not exist." };
  const group = groups.find((candidate) => candidate.id === (team?.groupId ?? groupId)) ?? null;
  if ((groupId || team) && !group) return { error: "That group does not exist." };

  const base = {
    workspace: { id: workspace.id, name: workspace.name, shortName: workspace.shortName, tone: workspace.tone },
    group: group ? { id: group.id, name: group.name, tone: group.tone } : null,
    team: team ? { id: team.id, name: team.name } : null
  };

  if (team) {
    const tasks = workspaceTasks.filter((task) => task.teamId === team.id);
    const lead = a.person(team.leadId);
    const oversees = new Set(team.supervisorIds ?? []);
    const members = [
      ...(lead ? [a.memberRow(lead.id, "Lead", tasks, team.name)] : []),
      ...team.memberIds
        .filter((id) => id !== team.leadId)
        .map((id) => a.memberRow(id, oversees.has(id) ? "Oversees" : "Member", tasks, team.name))
    ];
    const workers = members.filter((member) => member.role === "Member").length;
    return {
      ...base,
      scope: "team",
      id: team.id,
      name: team.name,
      tone: group.tone,
      subtitle: `Team in ${group.name} · ${workspace.name}`,
      lead,
      admins: [],
      counts: { members: members.length, workers, supervisors: members.length - workers, groups: 0, teams: 0 },
      ...a.metricsFor(tasks),
      byStatus: a.statusBreakdown(tasks),
      byClient: a.clientBreakdown(tasks).slice(0, 6),
      byPriority: a.priorityBreakdown(tasks),
      members,
      groups: [],
      teams: []
    };
  }

  if (group) {
    const tasks = workspaceTasks.filter((task) => task.groupId === group.id);
    const teams = snapshot.teams.filter((candidate) => candidate.groupId === group.id);
    const lead = a.person(group.leadId);
    const seen = new Map();
    if (lead) seen.set(lead.id, a.memberRow(lead.id, "Lead", tasks));
    teams.forEach((item) => {
      if (item.leadId && !seen.has(item.leadId)) seen.set(item.leadId, a.memberRow(item.leadId, "Team lead", tasks, item.name));
      const itemOversees = new Set(item.supervisorIds ?? []);
      item.memberIds.forEach((id) => {
        if (!seen.has(id)) seen.set(id, a.memberRow(id, itemOversees.has(id) ? "Oversees" : "Member", tasks, item.name));
      });
    });
    return {
      ...base,
      scope: "group",
      id: group.id,
      name: group.name,
      tone: group.tone,
      subtitle: `Group in ${workspace.name}`,
      lead,
      admins: [],
      counts: {
        members: seen.size,
        workers: [...seen.values()].filter((member) => member.role === "Member").length,
        supervisors: [...seen.values()].filter((member) => member.role !== "Member").length,
        groups: 0,
        teams: teams.length
      },
      ...a.metricsFor(tasks),
      byStatus: a.statusBreakdown(tasks),
      byClient: a.clientBreakdown(tasks).slice(0, 6),
      byPriority: a.priorityBreakdown(tasks),
      members: [...seen.values()],
      groups: [],
      teams: teams.map((item) => a.teamSummary(item, group, tasks)).sort((x, y) => y.assigned - x.assigned)
    };
  }

  const teams = groups.flatMap((item) =>
    snapshot.teams.filter((candidate) => candidate.groupId === item.id).map((candidate) => a.teamSummary(candidate, item, workspaceTasks))
  );
  const leadIds = new Set([...groups.map((item) => item.leadId), ...snapshot.teams.map((item) => item.leadId)].filter(Boolean));
  const teamOf = (employeeId) =>
    snapshot.teams.find((candidate) => candidate.leadId === employeeId || candidate.memberIds.includes(employeeId));
  const members = snapshot.members.map((member) => {
    const role = workspace.adminIds.includes(member.employeeId) ? "Admin" : leadIds.has(member.employeeId) ? "Lead" : "Member";
    return a.memberRow(member.employeeId, role, workspaceTasks, teamOf(member.employeeId)?.name ?? null);
  });

  return {
    ...base,
    scope: "workspace",
    id: workspace.id,
    name: workspace.name,
    shortName: workspace.shortName,
    tone: workspace.tone,
    subtitle: workspace.description,
    createdAt: workspace.createdAt,
    lead: null,
    admins: workspace.adminIds.map(a.person).filter(Boolean),
    counts: { members: members.length, groups: groups.length, teams: teams.length },
    ...a.metricsFor(workspaceTasks),
    byStatus: a.statusBreakdown(workspaceTasks),
    byClient: a.clientBreakdown(workspaceTasks).slice(0, 6),
    byPriority: a.priorityBreakdown(workspaceTasks),
    members,
    groups: groups.map((item) => a.groupSummary(item, workspaceTasks)).sort((x, y) => y.tasks - x.tasks),
    teams: teams.sort((x, y) => y.assigned - x.assigned)
  };
};

const isOrganisationWide = (req) => req.user.userTypeId === USER_TYPE.MASTER_ADMIN;

const scopedWorkspaceIds = async (req) =>
  isOrganisationWide(req) ? null : workspaceModel.findWorkspaceIdsForEmployee(req.user.employeeId);

const hasPermission = (req, permission) => (req.permissions || []).includes(permission);

const assignedToMe = (req, snapshot) => {
  const tasks = snapshot.tasks.filter((task) => task.assigneeIds.includes(req.user.employeeId));
  const ids = new Set(tasks.map((task) => task.id));
  return { ...snapshot, tasks, correctionMoveTaskIds: snapshot.correctionMoveTaskIds.filter((taskId) => ids.has(taskId)) };
};

const ownTasksOnly = async (req, snapshot) =>
  (await access.isOwnTasksOnly(req, snapshot.workspace.id)) ? assignedToMe(req, snapshot) : snapshot;

const withinPeriod = (snapshot, period) => {
  if (!period.from) return snapshot;
  const kindById = new Map(snapshot.columns.map((column) => [column.id, column.kind]));
  const tasks = snapshot.tasks.filter((task) => belongsToPeriod(period, task, kindById.get(task.statusId) === "completed"));
  const ids = new Set(tasks.map((task) => task.id));
  return { ...snapshot, tasks, correctionMoveTaskIds: snapshot.correctionMoveTaskIds.filter((taskId) => ids.has(taskId)) };
};

const getOverview = async (req, res) => {
  const period = periodFrom(req.query);
  const scope = await scopedWorkspaceIds(req);
  const workspaceIds = scope ?? (await workspaceModel.findAllWorkspaces()).map((row) => row.id);

  const directory = await dashboardModel.findEmployeeDirectory();
  const workspaces = [];
  const assignedPeople = new Set();
  for (const workspaceId of workspaceIds) {
    const loaded = await dashboardModel.loadWorkspaceSnapshot(workspaceId);
    if (!loaded) continue;
    const snapshot = withinPeriod(await ownTasksOnly(req, loaded), period);
    workspaces.push(summariseWorkspace(snapshot, directory));
    snapshot.members.forEach((member) => assignedPeople.add(member.employeeId));
  }

  const totals = workspaces.reduce(
      (acc, workspace) => ({
        workspaces: acc.workspaces + 1,
        members: acc.members + workspace.members,
        tasks: acc.tasks + workspace.tasks,
        open: acc.open + workspace.open,
        completed: acc.completed + workspace.completed,
        inCorrection: acc.inCorrection + workspace.inCorrection,
        correctionMoves: acc.correctionMoves + workspace.correctionMoves,
        overdue: acc.overdue + workspace.overdue,
        points: acc.points + workspace.points
      }),
      { workspaces: 0, members: 0, tasks: 0, open: 0, completed: 0, inCorrection: 0, correctionMoves: 0, overdue: 0, points: 0 }
    );

  res.json({
    isOrganisationWide: scope === null,
    workspaces,
    totals: {
      ...totals,
      employees: await dashboardModel.countActiveEmployees(scope),
      assigned: assignedPeople.size
    }
  });
};

const getScopeSummary = async (req, res) => {
  const { workspaceId } = req.params;
  const loaded = await dashboardModel.loadWorkspaceSnapshot(workspaceId);
  if (!loaded) return notFound(res, "That workspace does not exist.");
  if (!isOrganisationWide(req) && !(await workspaceModel.isMember(workspaceId, req.user.employeeId))) {
    return forbidden(res);
  }
  const personal = !hasPermission(req, "workspace.view");
  const scoped = personal ? assignedToMe(req, loaded) : await ownTasksOnly(req, loaded);
  const snapshot = withinPeriod(scoped, periodFrom(req.query));

  const directory = await dashboardModel.findEmployeeDirectory();
  const summary = summariseScope(snapshot, directory, {
    groupId: typeof req.query.groupId === "string" ? req.query.groupId.trim() : "",
    teamId: typeof req.query.teamId === "string" ? req.query.teamId.trim() : ""
  });
  if (summary.error) return notFound(res, summary.error);

  if (personal) {
    return res.json({
      ...summary,
      personal: true,
      lead: null,
      admins: [],
      counts: { members: 0, groups: 0, teams: 0 },
      members: [],
      groups: [],
      teams: []
    });
  }

  res.json(summary);
};

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_TRACKER_DAYS = 93;

const validDay = (value) => {
  const text = typeof value === "string" ? value.trim() : "";
  return DAY_PATTERN.test(text) && !Number.isNaN(Date.parse(text)) ? text : "";
};

const spanInDays = (from, to) => Math.round((Date.parse(to) - Date.parse(from)) / 86400000) + 1;

const getDailyTracker = async (req, res) => {
  const { workspaceId } = req.params;
  const single = validDay(req.query.date);
  const from = single || validDay(req.query.from) || today();
  const to = single || validDay(req.query.to) || from;
  if (from > to) {
    return res.status(400).json({ message: "The start date must be on or before the end date.", code: "VALIDATION_ERROR" });
  }
  if (spanInDays(from, to) > MAX_TRACKER_DAYS) {
    return res.status(400).json({ message: `Pick a range of ${MAX_TRACKER_DAYS} days or fewer.`, code: "VALIDATION_ERROR" });
  }

  const workspace = await workspaceModel.findWorkspaceById(workspaceId);
  if (!workspace) return notFound(res, "That workspace does not exist.");
  if (!isOrganisationWide(req) && !(await workspaceModel.isMember(workspaceId, req.user.employeeId))) {
    return forbidden(res);
  }

  const includeTickets = hasPermission(req, "ticket.view");
  const [tracker, directory, onlyMine] = await Promise.all([
    dashboardModel.loadTracker(workspaceId, from, to, { includeTickets }),
    dashboardModel.findEmployeeDirectory(),
    access.isOwnTasksOnly(req, workspaceId)
  ]);

  const teamById = new Map(tracker.teams.map((team) => [team.id, team]));
  const people = new Map();
  const enlist = (employeeId, team, { lead = false, oversees = false } = {}) => {
    if (!employeeId) return;
    if (!people.has(employeeId)) people.set(employeeId, { isLead: false, oversees: false, teamIds: [], groupIds: [] });
    const entry = people.get(employeeId);
    entry.isLead = entry.isLead || lead;
    entry.oversees = entry.oversees || oversees;
    if (team && !entry.teamIds.includes(team.id)) entry.teamIds.push(team.id);
    if (team && !entry.groupIds.includes(team.groupId)) entry.groupIds.push(team.groupId);
  };

  tracker.teams.forEach((team) => enlist(team.leadId, team, { lead: true }));
  tracker.teamMembers.forEach((member) => {
    const team = teamById.get(member.teamId);
    enlist(member.employeeId, team, { oversees: member.role === "supervisor" && team?.leadId !== member.employeeId });
  });
  tracker.entries.forEach((entry) => enlist(entry.id, null));

  const teamOrder = new Map(tracker.teams.map((team, index) => [team.id, index]));
  const visible = (employeeId) => !onlyMine || employeeId === req.user.employeeId;

  const peopleRows = [...people]
    .filter(([employeeId]) => visible(employeeId))
    .map(([employeeId, entry]) => {
      const profile = directory.get(employeeId);
      return {
        id: employeeId,
        fullName: profile?.fullName ?? "Unknown",
        designation: profile?.designation || (entry.isLead ? "Team lead" : "Member"),
        isLead: entry.isLead,
        oversees: entry.oversees && !entry.isLead,
        teamIds: entry.teamIds,
        groupIds: entry.groupIds,
        teamName: teamById.get(entry.teamIds[0])?.name ?? null
      };
    })
    .sort((a, b) => {
      const order = (row) => (row.teamIds.length ? teamOrder.get(row.teamIds[0]) : Infinity);
      const rank = (row) => (row.isLead ? 0 : row.oversees ? 1 : 2);
      return order(a) - order(b) || rank(a) - rank(b) || a.fullName.localeCompare(b.fullName);
    });

  const entries = tracker.entries.filter((entry) => visible(entry.id));
  const handling = tracker.handling.filter((row) => people.has(row.employeeId) && visible(row.employeeId));
  const taskIds = new Set();
  const ticketIds = new Set();
  entries.forEach((entry) => {
    ["assigned", "corrections", "completed", "inProgress", "inReview", "overdue"].forEach((list) =>
      entry[list].forEach((id) => taskIds.add(id))
    );
    [...entry.complaints, ...entry.requirementsDone].forEach((id) => ticketIds.add(id));
  });
  const tasks = tracker.tasks.filter((task) => taskIds.has(task.id));
  const tickets = tracker.tickets.filter((ticket) => ticketIds.has(ticket.id));
  const clientIds = new Set([
    ...handling.map((row) => row.clientId),
    ...tasks.map((task) => task.clientId),
    ...tickets.map((ticket) => ticket.clientId)
  ]);

  res.json({
    from,
    to,
    workspace: { id: workspace.id, name: workspace.name },
    capabilities: { tickets: includeTickets },
    groups: tracker.groups,
    teams: tracker.teams.map((team) => ({ id: team.id, name: team.name, groupId: team.groupId })),
    people: peopleRows,
    entries,
    tasks,
    tickets,
    clients: tracker.clients.filter((client) => clientIds.has(client.id)),
    handling
  });
};

const XLSX_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const exportDailyTracker = async (req, res) => {
  const result = await buildTrackerWorkbook(req.body);
  if (result.error) return res.status(400).json({ message: result.error, code: "VALIDATION_ERROR" });

  const requested = typeof req.body?.filename === "string" ? req.body.filename : "";
  const base = requested.replace(/\.xlsx$/i, "").replace(/[^\w.-]+/g, "-").slice(0, 80) || "daily-tracker";

  res.setHeader("Content-Type", XLSX_TYPE);
  res.setHeader("Content-Disposition", `attachment; filename="${base}.xlsx"`);
  res.setHeader("Cache-Control", "no-store");
  res.send(Buffer.from(result.buffer));
};

const getEmployeeStats = async (req, res) => {
  const { totals, departments } = await dashboardModel.findEmployeeStats(await scopedWorkspaceIds(req));
  res.json({
    totalEmployees: Number(totals.active) || 0,
    newEmployees: Number(totals.new_joiners) || 0,
    onProbation: Number(totals.on_probation) || 0,
    onNotice: Number(totals.on_notice) || 0,
    departmentBreakdown: departments.map((row) => ({ department: row.department, count: row.count }))
  });
};

const getRecentEmployees = async (req, res) => {
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 6));
  const rows = await dashboardModel.findRecentEmployees(limit, await scopedWorkspaceIds(req));
  res.json(
    rows.map((row) => ({
      id: row.employee_id,
      fullName: row.full_name,
      designation: row.designation,
      department: row.department,
      joiningDate: row.joining_date,
      status: row.status
    }))
  );
};

module.exports = {
  getOverview,
  getScopeSummary,
  getDailyTracker,
  exportDailyTracker,
  getEmployeeStats,
  getRecentEmployees
};
