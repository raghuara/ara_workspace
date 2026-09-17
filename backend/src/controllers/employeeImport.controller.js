const bcrypt = require("bcryptjs");
const employeeModel = require("../models/employee.model");
const accountModel = require("../models/account.model");
const workspaceModel = require("../models/workspace.model");
const access = require("../services/access.service");
const { departmentModel, designationModel } = require("../models/catalog.model");
const { withTransaction } = require("../utils/transaction");
const { generatePassword } = require("./account.controller");
const importService = require("../services/employeeImport.service");

const XLSX_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const LOGIN_PERMISSION = "account.manage";

const badRequest = (res, message, code = "BAD_REQUEST") => res.status(400).json({ message, code });

const activeNames = (rows) => rows.filter((row) => row.is_active === undefined || row.is_active).map((row) => row.name);

const resolveWorkspace = async (req, res, workspaceId) => {
  if (!workspaceId) {
    badRequest(res, "Choose the workspace these employees belong to.");
    return null;
  }
  const workspace = await workspaceModel.findWorkspaceById(workspaceId);
  if (!workspace) {
    res.status(404).json({ message: "That workspace does not exist.", code: "NOT_FOUND" });
    return null;
  }
  if (!access.inScope(await access.allowedWorkspaceIds(req), workspaceId)) {
    res.status(403).json({ message: "You do not have access to this workspace.", code: "FORBIDDEN" });
    return null;
  }
  return workspace;
};

const loadCatalogs = async (req, workspaceId) => {
  const [departments, designations, userTypes] = await Promise.all([
    departmentModel.findAll(workspaceId),
    designationModel.findAll(workspaceId),
    accountModel.findUserTypes()
  ]);
  return {
    departments: activeNames(departments),
    designations: activeNames(designations),
    userTypes: access.assignableUserTypes(req, userTypes).map((type) => ({ id: type.id, name: type.name }))
  };
};

const loadContext = async (req, rows, workspaceId) => {
  const catalogs = await loadCatalogs(req, workspaceId);
  const emails = rows.flatMap((row) => [row.data.email, row.data.reportingManagerEmail]).filter(Boolean).map((email) => email.toLowerCase());
  const existing = await employeeModel.findByEmails([...new Set(emails)]);

  return {
    ...catalogs,
    existingByEmail: new Map(existing.map((row) => [row.email.toLowerCase(), row.employee_id])),
    managerIdByEmail: new Map(
      existing.filter((row) => row.workspace_id === workspaceId).map((row) => [row.email.toLowerCase(), row.employee_id])
    ),
    canCreateLogins: (req.permissions || []).includes(LOGIN_PERMISSION)
  };
};

const parseUpload = async (req, res) => {
  if (!req.file) {
    badRequest(res, "Choose the filled-in .xlsx file to upload.");
    return null;
  }
  if (req.file.mimetype !== XLSX_TYPE && !req.file.originalname.toLowerCase().endsWith(".xlsx")) {
    badRequest(res, "Only .xlsx files are accepted. Download the template and fill it in.");
    return null;
  }
  const parsed = await importService.parseWorkbook(req.file.buffer);
  if (parsed.error) {
    badRequest(res, parsed.error, "INVALID_FILE");
    return null;
  }
  return parsed;
};

const publicRow = (row) => ({
  rowNumber: row.rowNumber,
  status: row.status,
  errors: row.errors,
  warnings: row.warnings,
  data: {
    firstName: row.data.firstName,
    lastName: row.data.lastName,
    email: row.data.email,
    phone: row.data.phone,
    department: row.data.department ?? row.raw.department ?? "",
    designation: row.data.designation ?? row.raw.designation ?? "",
    joiningDate: row.data.joiningDate,
    status: row.data.status,
    employmentType: row.data.employmentType,
    workLocation: row.data.workLocation,
    reportingManagerEmail: row.data.reportingManagerEmail,
    createLogin: row.data.createLogin,
    userTypeName: row.data.userTypeName
  }
});

const downloadTemplate = async (req, res) => {
  const workspace = await resolveWorkspace(req, res, typeof req.query.workspaceId === "string" ? req.query.workspaceId.trim() : "");
  if (!workspace) return;

  const buffer = await importService.buildTemplate(await loadCatalogs(req, workspace.id));

  res.setHeader("Content-Type", XLSX_TYPE);
  res.setHeader("Content-Disposition", 'attachment; filename="employee-import-template.xlsx"');
  res.setHeader("Cache-Control", "no-store");
  res.send(Buffer.from(buffer));
};

const workspaceFromBody = (req) => (typeof req.body?.workspaceId === "string" ? req.body.workspaceId.trim() : "");

const previewImport = async (req, res) => {
  const workspace = await resolveWorkspace(req, res, workspaceFromBody(req));
  if (!workspace) return;
  const parsed = await parseUpload(req, res);
  if (!parsed) return;

  const context = await loadContext(req, parsed.rows, workspace.id);
  const rows = importService.validateRows(parsed.rows, context);

  res.json({
    fileName: req.file.originalname,
    columns: parsed.columns,
    canCreateLogins: context.canCreateLogins,
    summary: importService.summarise(rows),
    rows: rows.map(publicRow)
  });
};

const runImport = async (req, res) => {
  const workspace = await resolveWorkspace(req, res, workspaceFromBody(req));
  if (!workspace) return;
  const parsed = await parseUpload(req, res);
  if (!parsed) return;

  const wantLogins = String(req.body.createLogins ?? "true").toLowerCase() !== "false";
  const context = await loadContext(req, parsed.rows, workspace.id);
  const rows = importService.validateRows(parsed.rows, context);
  const ready = rows.filter((row) => row.status === "ready");

  if (ready.length === 0) {
    return res.status(400).json({
      message: "Nothing to import — every row either has a problem or already exists.",
      code: "NOTHING_TO_IMPORT",
      summary: importService.summarise(rows),
      rows: rows.map(publicRow)
    });
  }

  const passwords = new Map();
  for (const row of ready) {
    if (wantLogins && row.data.createLogin) passwords.set(row.rowNumber, generatePassword());
  }
  const hashes = new Map();
  for (const [rowNumber, password] of passwords) hashes.set(rowNumber, await bcrypt.hash(password, 10));

  const created = await withTransaction(async (connection) => {
    let number = await employeeModel.maxEmployeeNumber(connection);
    const idByEmail = new Map(context.managerIdByEmail);
    const results = [];

    for (const row of ready) {
      number += 1;
      const employeeId = `EMP-${String(number).padStart(4, "0")}`;
      await employeeModel.insertEmployee(
        {
          employeeId,
          workspaceId: workspace.id,
          firstName: row.data.firstName,
          lastName: row.data.lastName,
          email: row.data.email,
          phone: row.data.phone,
          department: row.data.department,
          designation: row.data.designation,
          joiningDate: row.data.joiningDate,
          status: row.data.status,
          employmentType: row.data.employmentType,
          workLocation: row.data.workLocation,
          reportingManagerId: null
        },
        connection
      );
      idByEmail.set(row.data.email, employeeId);

      let login = null;
      if (hashes.has(row.rowNumber)) {
        await accountModel.insertAccount(
          { employeeId, email: row.data.email, passwordHash: hashes.get(row.rowNumber), userTypeId: row.data.userTypeId },
          connection
        );
        login = { userTypeName: row.data.userTypeName, temporaryPassword: passwords.get(row.rowNumber) };
      }

      results.push({
        rowNumber: row.rowNumber,
        employeeId,
        fullName: `${row.data.firstName} ${row.data.lastName}`,
        email: row.data.email,
        department: row.data.department,
        designation: row.data.designation,
        reportingManagerEmail: row.data.reportingManagerEmail,
        login
      });
    }

    for (const row of ready) {
      const managerId = row.data.reportingManagerEmail ? idByEmail.get(row.data.reportingManagerEmail) : null;
      if (managerId) await employeeModel.setReportingManager(idByEmail.get(row.data.email), managerId, connection);
    }

    return results;
  });

  res.status(201).json({
    created,
    skipped: rows
      .filter((row) => row.status !== "ready")
      .map((row) => ({
        rowNumber: row.rowNumber,
        email: row.data.email,
        fullName: `${row.data.firstName} ${row.data.lastName}`.trim(),
        reason: row.status === "exists" ? "An employee with this email already exists." : Object.values(row.errors).join(" ")
      })),
    summary: {
      created: created.length,
      logins: created.filter((row) => row.login).length,
      skipped: rows.length - created.length
    }
  });
};

module.exports = {
  downloadTemplate,
  previewImport,
  runImport
};
