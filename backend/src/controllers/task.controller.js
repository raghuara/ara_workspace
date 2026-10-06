const taskModel = require("../models/task.model");
const commentModel = require("../models/comment.model");
const workspaceModel = require("../models/workspace.model");
const { runRecurringTasks } = require("../services/recurring.service");
const notifications = require("../services/notification.service");
const access = require("../services/access.service");
const { nextId } = require("../utils/ids");
const { withTransaction } = require("../utils/transaction");
const { PRIORITIES, TASK_SIZES, USER_TYPE } = require("../constants/workspace");
const { periodFrom } = require("../utils/period");

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TABS = ["today", "scheduled", "overdue", "all"];
const DESCRIPTION_MAX = 5000;
const COMMENT_MAX = 4000;

const text = (value) => (typeof value === "string" ? value.trim() : "");
const idList = (value) => (Array.isArray(value) ? [...new Set(value.map(text).filter(Boolean))] : []);
const isValidDate = (value) => DATE_PATTERN.test(value) && !Number.isNaN(Date.parse(value));
const parseJson = (value, fallback) => {
  if (Array.isArray(value) || (value && typeof value === "object")) return value;
  if (typeof value !== "string") return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const isMasterAdmin = (req) => req.user.userTypeId === USER_TYPE.MASTER_ADMIN;
const can = (req, permission) => (req.permissions || []).includes(permission);

const badRequest = (res, message, errors) =>
  res.status(400).json({ message, code: errors ? "VALIDATION_ERROR" : "BAD_REQUEST", ...(errors && { errors }) });
const notFound = (res, message = "That task could not be found.") => res.status(404).json({ message, code: "NOT_FOUND" });
const forbidden = (res) => res.status(403).json({ message: "You do not have access to this workspace.", code: "FORBIDDEN" });

const mapTask = (row, assignees = []) => ({
  id: row.id,
  workspaceId: row.workspace_id,
  groupId: row.group_id,
  teamId: row.team_id,
  clientId: row.client_id,
  title: row.title,
  description: row.description ?? "",
  statusId: row.status_id,
  priority: row.priority,
  sizeKey: row.size_key,
  points: row.points,
  assigneeIds: assignees.map((assignee) => assignee.id),
  assignees,
  createdById: row.created_by_id,
  createdAt: row.created_at,
  dueDate: row.due_date,
  scheduledDate: row.scheduled_date,
  completedAt: row.completed_at,
  completedById: row.completed_by_id,
  tags: parseJson(row.tags, []),
  attachmentCount: row.attachment_count,
  commentCount: row.comment_count,
  statusName: row.status_name,
  statusKind: row.status_kind,
  statusTone: row.status_tone,
  clientName: row.client_name ?? "—",
  clientTone: row.client_tone ?? "slate",
  groupName: row.group_name ?? "—",
  groupTone: row.group_tone ?? "slate",
  teamName: row.team_name ?? "—",
  isOverdue: Boolean(row.is_overdue)
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

const withAssignees = async (rows) => {
  const assignees = await taskModel.findAssigneesByTaskIds(rows.map((row) => row.id));
  return rows.map((row) => mapTask(row, assignees.get(row.id) ?? []));
};

const loadOne = async (taskId) => {
  const row = await taskModel.findTaskById(taskId);
  if (!row) return null;
  const [task] = await withAssignees([row]);
  const meta = await taskModel.findDescriptionMeta(task.id);
  return {
    ...task,
    descriptionUpdatedAt: meta?.updated_at ?? null,
    descriptionUpdatedByName: meta?.updated_by_name ?? null
  };
};

const ensureWorkspaceAccess = async (req, res, workspaceId) => {
  const workspace = await workspaceModel.findWorkspaceById(workspaceId);
  if (!workspace) {
    notFound(res, "That workspace does not exist.");
    return false;
  }
  if (!isMasterAdmin(req) && !(await workspaceModel.isMember(workspaceId, req.user.employeeId))) {
    forbidden(res);
    return false;
  }
  return true;
};

const visibilityFor = async (req, workspaceId) => access.visibilityFilter(await access.resolveScopes(req, workspaceId));

const canAccessTask = async (req, task, { write = false } = {}) => {
  const scopes = await access.resolveScopes(req, task.workspaceId);
  return write ? access.canEditTask(scopes, task) : access.canViewTask(scopes, task);
};

const outsideScope = (res) =>
  res.status(403).json({ message: "You do not have access to this task. Ask your workspace admin for access to its group or team.", code: "FORBIDDEN" });

const viewOnly = (res) =>
  res.status(403).json({ message: "You have view-only access here. Ask your workspace admin for edit access.", code: "FORBIDDEN" });

const cannotAssign = (res) =>
  res.status(403).json({ message: "You do not have permission to assign tasks.", code: "FORBIDDEN" });

const FIELD_PERMISSIONS = {
  statusId: { permission: "task.move", label: "move tasks between columns" },
  sizeKey: { permission: "task.weightage.set", label: "change task size" }
};

const fieldPermission = (field) => FIELD_PERMISSIONS[field] ?? { permission: "task.update", label: "edit tasks" };

const descriptionHistory = (before, after) => {
  const from = before ?? "";
  const to = after ?? "";
  if (!from) return { summary: "added the description", detail: { fields: ["description"], after: to } };
  if (!to) return { summary: "removed the description", detail: { fields: ["description"], before: from } };
  return { summary: "edited the description", detail: { fields: ["description"], before: from, after: to } };
};

const notAllowedTo = (res, label) =>
  res.status(403).json({ message: `You do not have permission to ${label}.`, code: "FORBIDDEN" });

const filtersFrom = (query) => ({
  search: text(query.search),
  clientId: text(query.clientId),
  groupId: text(query.groupId),
  teamId: text(query.teamId),
  assigneeId: text(query.assigneeId),
  priority: text(query.priority),
  sizeKey: text(query.sizeKey),
  tab: TABS.includes(query.tab) ? query.tab : "all",
  ...periodFrom(query)
});

const runScheduledAutomation = async (workspaceId) => {
  const rules = await taskModel.findAutomationRules();
  if (!rules["scheduled-to-todo"]) return;

  const columns = await workspaceModel.findColumns(workspaceId);
  const todo = columns.find((column) => column.kind === "todo");
  if (!todo) return;

  const due = await taskModel.findDueScheduledTasks(workspaceId);
  if (due.length === 0) return;

  await taskModel.moveTasksToColumn(due.map((task) => task.id), todo.id);
  for (const task of due) {
    await taskModel.insertHistory({
      taskId: task.id,
      workspaceId,
      actorId: null,
      action: "moved",
      summary: "moved automatically — scheduled date reached",
      detail: { from: task.from_name, to: todo.name, automation: "scheduled-to-todo" }
    });
  }
};

const loadVisibleTasks = async (req, workspaceId, filters) => {
  await runRecurringTasks(workspaceId);
  await runScheduledAutomation(workspaceId);
  const rows = await taskModel.findTasks({ workspaceId, visibility: await visibilityFor(req, workspaceId), filters });
  return withAssignees(rows);
};

const getBoard = async (req, res) => {
  const { workspaceId } = req.params;
  if (!(await ensureWorkspaceAccess(req, res, workspaceId))) return;

  const tasks = await loadVisibleTasks(req, workspaceId, filtersFrom(req.query));
  const columns = await workspaceModel.findColumns(workspaceId);

  res.json({
    columns: columns.map((column) => {
      const columnTasks = tasks.filter((task) => task.statusId === column.id);
      return {
        ...mapColumn(column),
        tasks: columnTasks,
        taskCount: columnTasks.length,
        points: columnTasks.reduce((sum, task) => sum + task.points, 0)
      };
    }),
    totalTasks: tasks.length,
    totalPoints: tasks.reduce((sum, task) => sum + task.points, 0)
  });
};

const listTasks = async (req, res) => {
  const { workspaceId } = req.params;
  if (!(await ensureWorkspaceAccess(req, res, workspaceId))) return;

  res.json(await loadVisibleTasks(req, workspaceId, filtersFrom(req.query)));
};

const getTask = async (req, res) => {
  const task = await loadOne(req.params.taskId);
  if (!task) return notFound(res);
  if (!(await ensureWorkspaceAccess(req, res, task.workspaceId))) return;
  if (!(await canAccessTask(req, task))) return outsideScope(res);

  res.json(task);
};

const validateTaskFields = async (body, workspaceId, existing = null) => {
  const errors = {};
  const changes = {};
  const has = (field) => body[field] !== undefined;

  if (has("title") || !existing) {
    changes.title = text(body.title).slice(0, 200);
    if (!changes.title) errors.title = "A task title is required.";
  }

  if (has("description")) changes.description = text(body.description).slice(0, DESCRIPTION_MAX) || null;

  if (has("statusId") || !existing) {
    changes.statusId = text(body.statusId);
    if (!changes.statusId) errors.statusId = "Choose a group for the task.";
    else if (!(await taskModel.existsInWorkspace("status_columns", changes.statusId, workspaceId))) {
      errors.statusId = "That column does not exist.";
    }
  }

  if (has("groupId")) {
    changes.groupId = text(body.groupId) || null;
    if (changes.groupId && !(await taskModel.existsInWorkspace("workspace_groups", changes.groupId, workspaceId))) {
      errors.groupId = "That group does not exist.";
    }
  }

  if (has("teamId")) {
    changes.teamId = text(body.teamId) || null;
    if (changes.teamId && !(await taskModel.teamBelongsToWorkspace(changes.teamId, workspaceId))) {
      errors.teamId = "That team does not exist.";
    }
  }

  if (has("clientId")) {
    changes.clientId = text(body.clientId) || null;
    if (changes.clientId && !(await taskModel.existsInWorkspace("clients", changes.clientId, workspaceId))) {
      errors.clientId = "That client does not exist.";
    }
  }

  if (has("priority")) {
    changes.priority = text(body.priority);
    if (!PRIORITIES.includes(changes.priority)) errors.priority = "Unknown priority.";
  }

  if (has("sizeKey")) {
    changes.sizeKey = text(body.sizeKey);
    if (!TASK_SIZES[changes.sizeKey]) errors.sizeKey = "Unknown size.";
    else changes.points = TASK_SIZES[changes.sizeKey];
  }

  for (const field of ["dueDate", "scheduledDate"]) {
    if (has(field)) {
      changes[field] = text(body[field]) || null;
      if (changes[field] && !isValidDate(changes[field])) errors[field] = "Use the format YYYY-MM-DD.";
    }
  }

  if (has("tags")) {
    changes.tags = Array.isArray(body.tags) ? [...new Set(body.tags.map(text).filter(Boolean))].slice(0, 20) : [];
  }

  if (has("assigneeIds")) {
    changes.assigneeIds = idList(body.assigneeIds);
    if (!(await workspaceModel.employeesExist(changes.assigneeIds))) errors.assigneeIds = "Unknown employee.";
  }

  return { errors, changes };
};

const createTask = async (req, res) => {
  const { workspaceId } = req.params;
  if (!(await ensureWorkspaceAccess(req, res, workspaceId))) return;

  const { errors, changes } = await validateTaskFields(req.body, workspaceId);
  if (Object.keys(errors).length > 0) return badRequest(res, "Please fix the highlighted fields.", errors);

  const scopes = await access.resolveScopes(req, workspaceId);
  const target = { groupId: changes.groupId ?? null, teamId: changes.teamId ?? null, assigneeIds: [] };
  if (!access.canEditTask(scopes, target)) return viewOnly(res);

  const sizeKey = can(req, "task.weightage.set") ? (changes.sizeKey ?? "M") : "M";
  const assigneeIds = can(req, "task.assign") ? (changes.assigneeIds ?? []) : [req.user.employeeId];

  const taskId = await withTransaction(async (connection) => {
    const id = await nextId("TSK", connection);
    await taskModel.insertTask(
      {
        id,
        workspaceId,
        groupId: changes.groupId ?? null,
        teamId: changes.teamId ?? null,
        clientId: changes.clientId ?? null,
        statusId: changes.statusId,
        title: changes.title,
        description: changes.description ?? null,
        priority: changes.priority ?? "Normal",
        sizeKey,
        points: TASK_SIZES[sizeKey],
        tags: changes.tags ?? [],
        createdById: req.user.employeeId,
        dueDate: changes.dueDate ?? null,
        scheduledDate: changes.scheduledDate ?? null
      },
      connection
    );
    if (changes.description) {
      await taskModel.updateTask(
        id,
        { descriptionUpdatedAt: new Date(), descriptionUpdatedById: req.user.employeeId },
        connection
      );
    }
    await taskModel.replaceAssignees(id, assigneeIds, connection);

    const base = { taskId: id, workspaceId, actorId: req.user.employeeId };
    await taskModel.insertHistory({ ...base, action: "created", summary: "created this task" }, connection);
    if (assigneeIds.length > 0) {
      await taskModel.insertHistory(
        { ...base, action: "assigned", summary: "assigned this task", detail: { to: assigneeIds } },
        connection
      );
      await notifications.taskAssigned(
        { task: { id, workspaceId, title: changes.title }, assigneeIds, actorId: req.user.employeeId },
        connection
      );
    }
    return id;
  });

  res.status(201).json(await loadOne(taskId));
};

const updateTask = async (req, res) => {
  const existing = await loadOne(req.params.taskId);
  if (!existing) return notFound(res);
  if (!(await ensureWorkspaceAccess(req, res, existing.workspaceId))) return;
  if (!(await canAccessTask(req, existing))) return outsideScope(res);
  if (!(await canAccessTask(req, existing, { write: true }))) return viewOnly(res);

  const { errors, changes } = await validateTaskFields(req.body, existing.workspaceId, existing);
  if (Object.keys(errors).length > 0) return badRequest(res, "Please fix the highlighted fields.", errors);

  const { assigneeIds, ...fieldChanges } = changes;
  const unchanged = (field) =>
    field === "description"
      ? (fieldChanges.description ?? "") === (existing.description ?? "")
      : JSON.stringify(fieldChanges[field]) === JSON.stringify(existing[field] ?? null);
  const changedFields = Object.keys(fieldChanges).filter((field) => field !== "points" && !unchanged(field));
  const assigneesChanged =
    assigneeIds !== undefined && JSON.stringify([...assigneeIds].sort()) !== JSON.stringify([...existing.assigneeIds].sort());
  if (assigneesChanged && !can(req, "task.assign")) return cannotAssign(res);
  const blocked = changedFields.map(fieldPermission).find(({ permission }) => !can(req, permission));
  if (blocked) return notAllowedTo(res, blocked.label);

  const descriptionChanged = changedFields.includes("description");
  if (descriptionChanged) {
    if (await access.isOwnTasksOnly(req, existing.workspaceId)) {
      return res.status(403).json({
        message: "Employees can read the description but not change it. Add a comment instead.",
        code: "FORBIDDEN"
      });
    }
    fieldChanges.descriptionUpdatedAt = new Date();
    fieldChanges.descriptionUpdatedById = req.user.employeeId;
  }
  const otherFields = changedFields.filter((field) => field !== "description");

  await withTransaction(async (connection) => {
    if (changedFields.length > 0) await taskModel.updateTask(existing.id, fieldChanges, connection);
    if (assigneesChanged) await taskModel.replaceAssignees(existing.id, assigneeIds, connection);

    const base = { taskId: existing.id, workspaceId: existing.workspaceId, actorId: req.user.employeeId };
    if (otherFields.length > 0) {
      await taskModel.insertHistory(
        { ...base, action: "updated", summary: "updated this task", detail: { fields: otherFields } },
        connection
      );
    }
    if (descriptionChanged) {
      await taskModel.insertHistory(
        { ...base, action: "updated", ...descriptionHistory(existing.description, fieldChanges.description) },
        connection
      );
    }
    if (assigneesChanged) {
      await taskModel.insertHistory(
        { ...base, action: "assigned", summary: "changed the assignees", detail: { to: assigneeIds } },
        connection
      );
      const added = assigneeIds.filter((id) => !existing.assigneeIds.includes(id));
      await notifications.taskAssigned(
        { task: { id: existing.id, workspaceId: existing.workspaceId, title: existing.title }, assigneeIds: added, actorId: req.user.employeeId },
        connection
      );
    }
  });

  res.json(await loadOne(existing.id));
};

const moveTask = async (req, res) => {
  const existing = await loadOne(req.params.taskId);
  if (!existing) return notFound(res);
  if (!(await ensureWorkspaceAccess(req, res, existing.workspaceId))) return;
  if (!(await canAccessTask(req, existing))) return outsideScope(res);

  const statusId = text(req.body.statusId);
  const to = statusId ? await workspaceModel.findColumnById(statusId) : null;
  if (!to || to.workspace_id !== existing.workspaceId) return badRequest(res, "That column does not exist.");
  if (to.id === existing.statusId) return res.json(existing);

  const rules = await taskModel.findAutomationRules();
  const changes = { statusId: to.id };
  const base = { taskId: existing.id, workspaceId: existing.workspaceId, actorId: req.user.employeeId };
  let history;

  if (to.kind === "completed" && rules["complete-stamps-date"]) {
    changes.completedAt = new Date().toISOString().slice(0, 10);
    changes.completedById = req.user.employeeId;
    history = { ...base, action: "completed", summary: "marked this complete", detail: { from: existing.statusName, to: to.name } };
  } else {
    if (existing.statusKind === "completed" && rules["correction-reopen"]) {
      changes.completedAt = null;
      changes.completedById = null;
    }
    if (to.kind === "scheduled" && !existing.scheduledDate) {
      changes.scheduledDate = existing.dueDate ?? new Date().toISOString().slice(0, 10);
    }
    history = { ...base, action: "moved", summary: "moved this task", detail: { from: existing.statusName, to: to.name } };
  }

  await withTransaction(async (connection) => {
    await taskModel.updateTask(existing.id, changes, connection);
    await taskModel.insertHistory(history, connection);
    await notifications.taskMoved(
      {
        task: { id: existing.id, workspaceId: existing.workspaceId, title: existing.title, createdById: existing.createdById },
        assigneeIds: existing.assigneeIds,
        actorId: req.user.employeeId,
        toName: to.name,
        completed: to.kind === "completed"
      },
      connection
    );
  });

  res.json(await loadOne(existing.id));
};

const deleteTask = async (req, res) => {
  const existing = await loadOne(req.params.taskId);
  if (!existing) return notFound(res);
  if (!(await ensureWorkspaceAccess(req, res, existing.workspaceId))) return;
  if (!(await canAccessTask(req, existing))) return outsideScope(res);
  if (!(await canAccessTask(req, existing, { write: true }))) return viewOnly(res);

  await withTransaction(async (connection) => {
    await taskModel.insertHistory(
      { taskId: existing.id, workspaceId: existing.workspaceId, actorId: req.user.employeeId, action: "deleted", summary: "deleted this task" },
      connection
    );
    await notifications.taskDeleted(
      { task: { id: existing.id, workspaceId: existing.workspaceId, title: existing.title }, assigneeIds: existing.assigneeIds, actorId: req.user.employeeId },
      connection
    );
    await taskModel.deleteTask(existing.id, connection);
  });

  res.json({ id: existing.id });
};

const getTaskHistory = async (req, res) => {
  const existing = await loadOne(req.params.taskId);
  if (!existing) return notFound(res);
  if (!(await ensureWorkspaceAccess(req, res, existing.workspaceId))) return;
  if (!(await canAccessTask(req, existing))) return outsideScope(res);

  const rows = await taskModel.findHistory(existing.id);
  res.json(
    rows.map((row) => ({
      id: row.id,
      taskId: row.task_id,
      workspaceId: row.workspace_id,
      actorId: row.actor_id,
      actorName: row.actor_id ? (row.actor_name ?? "Unknown") : "Automation",
      action: row.action,
      summary: row.summary,
      detail: parseJson(row.detail, null),
      at: row.at
    }))
  );
};

const excerpt = (value, length) => {
  const flat = value.replace(/\s+/g, " ");
  return flat.length > length ? `${flat.slice(0, length - 1)}…` : flat;
};

const mapComment = (row) => ({
  id: row.id,
  taskId: row.task_id,
  authorId: row.author_id,
  authorName: row.author_name ?? "Former member",
  authorTypeId: row.author_type_id,
  authorTypeName: row.author_type_name ?? null,
  body: row.body,
  createdAt: row.created_at,
  editedAt: row.edited_at
});

const commentBodyFrom = (res, body) => {
  const value = text(body?.body);
  if (!value) {
    badRequest(res, "Write something before sending.", { body: "A comment cannot be empty." });
    return null;
  }
  if (value.length > COMMENT_MAX) {
    badRequest(res, `Comments can be up to ${COMMENT_MAX} characters.`, { body: "This comment is too long." });
    return null;
  }
  return value;
};

const loadReadableTask = async (req, res, taskId) => {
  const task = await loadOne(taskId);
  if (!task) {
    notFound(res);
    return null;
  }
  if (!(await ensureWorkspaceAccess(req, res, task.workspaceId))) return null;
  if (!(await canAccessTask(req, task))) {
    outsideScope(res);
    return null;
  }
  return task;
};

const loadCommentContext = async (req, res) => {
  const comment = await commentModel.findCommentById(req.params.commentId);
  if (!comment) {
    notFound(res, "That comment could not be found.");
    return {};
  }
  const task = await loadReadableTask(req, res, comment.task_id);
  return task ? { comment, task } : {};
};

const listComments = async (req, res) => {
  const task = await loadReadableTask(req, res, req.params.taskId);
  if (!task) return;

  res.json((await commentModel.findComments(task.id)).map(mapComment));
};

const createComment = async (req, res) => {
  const task = await loadReadableTask(req, res, req.params.taskId);
  if (!task) return;
  const body = commentBodyFrom(res, req.body);
  if (!body) return;

  const commentId = await withTransaction(async (connection) => {
    const id = await commentModel.insertComment(
      {
        taskId: task.id,
        workspaceId: task.workspaceId,
        authorId: req.user.employeeId ?? null,
        authorTypeId: req.user.userTypeId ?? null,
        body,
        createdAt: new Date()
      },
      connection
    );
    await taskModel.insertHistory(
      {
        taskId: task.id,
        workspaceId: task.workspaceId,
        actorId: req.user.employeeId,
        action: "commented",
        summary: "commented",
        detail: { excerpt: excerpt(body, 140) }
      },
      connection
    );
    await notifications.taskCommented(
      {
        task: { id: task.id, workspaceId: task.workspaceId, title: task.title, createdById: task.createdById },
        assigneeIds: task.assigneeIds,
        actorId: req.user.employeeId,
        excerpt: excerpt(body, 80)
      },
      connection
    );
    return id;
  });

  res.status(201).json(mapComment(await commentModel.findCommentById(commentId)));
};

const updateComment = async (req, res) => {
  const { comment, task } = await loadCommentContext(req, res);
  if (!comment) return;
  if (comment.author_id !== req.user.employeeId) {
    return res.status(403).json({ message: "You can only edit your own comments.", code: "FORBIDDEN" });
  }
  const body = commentBodyFrom(res, req.body);
  if (!body) return;

  if (body !== comment.body) {
    await withTransaction(async (connection) => {
      await commentModel.updateComment(comment.id, body, new Date(), connection);
      await taskModel.insertHistory(
        {
          taskId: task.id,
          workspaceId: task.workspaceId,
          actorId: req.user.employeeId,
          action: "commented",
          summary: "edited a comment",
          detail: { before: comment.body, after: body }
        },
        connection
      );
    });
  }
  res.json(mapComment(await commentModel.findCommentById(comment.id)));
};

const deleteComment = async (req, res) => {
  const { comment, task } = await loadCommentContext(req, res);
  if (!comment) return;
  const own = comment.author_id === req.user.employeeId;
  if (!own && !(await access.resolveScopes(req, task.workspaceId)).admin) {
    return res.status(403).json({ message: "Only the author or an admin can delete this comment.", code: "FORBIDDEN" });
  }

  await withTransaction(async (connection) => {
    await commentModel.deleteComment(comment, connection);
    await taskModel.insertHistory(
      {
        taskId: task.id,
        workspaceId: task.workspaceId,
        actorId: req.user.employeeId,
        action: "commented",
        summary: own ? "deleted a comment" : `deleted a comment by ${comment.author_name ?? "a former member"}`,
        detail: { before: comment.body }
      },
      connection
    );
  });
  res.json({ id: comment.id });
};

const monthsBetween = (from, to) => {
  const months = [];
  let [year, month] = from.slice(0, 7).split("-").map(Number);
  const [endYear, endMonth] = to.slice(0, 7).split("-").map(Number);
  while ((year < endYear || (year === endYear && month <= endMonth)) && months.length < 60) {
    months.push(`${year}-${String(month).padStart(2, "0")}`);
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return months;
};

const getWorkloadReport = async (req, res) => {
  const { workspaceId } = req.params;
  if (!(await ensureWorkspaceAccess(req, res, workspaceId))) return;

  const from = isValidDate(text(req.query.from)) ? text(req.query.from) : null;
  const to = isValidDate(text(req.query.to)) ? text(req.query.to) : null;
  if (from && to && from > to) return badRequest(res, "The start date must be on or before the end date.");

  const completedOn = (task) => task.completedAt ?? task.dueDate ?? task.createdAt;
  const inPeriod = (task) => {
    const day = completedOn(task);
    return Boolean(day) && (!from || day >= from) && (!to || day <= to);
  };

  const tasks = await loadVisibleTasks(req, workspaceId, { ...filtersFrom(req.query), tab: "all" });

  const months = from && to ? monthsBetween(from, to) : [];
  const byMonth = new Map(months.map((month) => [month, { month, completedTasks: 0, completedPoints: 0 }]));

  const byPerson = new Map();
  const byTeam = new Map();
  const tally = (row, task, completed) => {
    if (completed) {
      row.completedTasks += 1;
      row.completedPoints += task.points;
    } else {
      row.openTasks += 1;
      row.openPoints += task.points;
    }
  };
  const emptyTally = () => ({ openTasks: 0, completedTasks: 0, openPoints: 0, completedPoints: 0 });

  tasks.forEach((task) => {
    const completed = task.statusKind === "completed";
    if (completed && !inPeriod(task)) return;

    const teamKey = task.teamId ?? "none";
    if (!byTeam.has(teamKey)) {
      byTeam.set(teamKey, {
        teamId: task.teamId ?? null,
        name: task.teamId ? task.teamName : "Not in a team",
        groupId: task.teamId ? task.groupId : null,
        groupName: task.teamId ? task.groupName : null,
        groupTone: task.teamId ? task.groupTone : "slate",
        ...emptyTally(),
        members: new Map()
      });
    }
    const team = byTeam.get(teamKey);
    tally(team, task, completed);
    task.assignees.forEach((assignee) => {
      if (!team.members.has(assignee.id)) {
        team.members.set(assignee.id, { employeeId: assignee.id, fullName: assignee.fullName, ...emptyTally() });
      }
      tally(team.members.get(assignee.id), task, completed);
    });

    task.assignees.forEach((assignee) => {
      if (!byPerson.has(assignee.id)) {
        byPerson.set(assignee.id, {
          employeeId: assignee.id,
          fullName: assignee.fullName,
          openTasks: 0,
          completedTasks: 0,
          openPoints: 0,
          completedPoints: 0
        });
      }
      const row = byPerson.get(assignee.id);
      if (completed) {
        row.completedTasks += 1;
        row.completedPoints += task.points;
        const bucket = byMonth.get(completedOn(task).slice(0, 7));
        if (bucket) {
          bucket.completedTasks += 1;
          bucket.completedPoints += task.points;
        }
      } else {
        row.openTasks += 1;
        row.openPoints += task.points;
      }
    });
  });

  const designations = new Map(
    (await workspaceModel.findMembers(workspaceId)).map((member) => [member.employee_id, member.designation])
  );

  const rows = [...byPerson.values()].map((row) => ({
    ...row,
    designation: designations.get(row.employeeId) ?? "—",
    totalTasks: row.openTasks + row.completedTasks,
    totalPoints: row.openPoints + row.completedPoints,
    averagePoints: row.completedTasks > 0 ? Number((row.completedPoints / row.completedTasks).toFixed(1)) : 0
  }));

  const totalCompletedPoints = rows.reduce((sum, row) => sum + row.completedPoints, 0);
  const totalCompletedTasks = rows.reduce((sum, row) => sum + row.completedTasks, 0);

  res.json({
    period: { from, to },
    rows: rows
      .map((row) => ({
        ...row,
        pointShare: totalCompletedPoints > 0 ? Number(((row.completedPoints / totalCompletedPoints) * 100).toFixed(1)) : 0,
        taskShare: totalCompletedTasks > 0 ? Number(((row.completedTasks / totalCompletedTasks) * 100).toFixed(1)) : 0
      }))
      .sort((a, b) => b.completedPoints - a.completedPoints),
    byMonth: [...byMonth.values()],
    byTeam: [...byTeam.values()]
      .map((team) => ({
        ...team,
        members: [...team.members.values()]
          .map((member) => ({
            ...member,
            designation: designations.get(member.employeeId) ?? "—",
            averagePoints: member.completedTasks > 0 ? Number((member.completedPoints / member.completedTasks).toFixed(1)) : 0
          }))
          .sort((a, b) => b.completedPoints - a.completedPoints || b.completedTasks - a.completedTasks)
      }))
      .sort((a, b) => b.completedPoints - a.completedPoints || b.completedTasks - a.completedTasks),
    totalCompletedPoints,
    totalCompletedTasks
  });
};

module.exports = {
  getBoard,
  listTasks,
  getTask,
  createTask,
  updateTask,
  moveTask,
  deleteTask,
  getTaskHistory,
  listComments,
  createComment,
  updateComment,
  deleteComment,
  getWorkloadReport
};
