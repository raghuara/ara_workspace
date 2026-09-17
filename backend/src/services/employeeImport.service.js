const ExcelJS = require("exceljs");
const { EMPLOYMENT_STATUSES, EMPLOYMENT_TYPES, WORK_LOCATIONS } = require("../constants/employee");

const SHEET_NAME = "Employees";
const LISTS_SHEET = "Lists";
const MAX_ROWS = 500;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const YES = new Set(["yes", "y", "true", "1"]);
const NO = new Set(["no", "n", "false", "0", ""]);

// One entry per template column, in sheet order. `list` names a column on
// the hidden Lists sheet that feeds the cell's dropdown.
const COLUMNS = [
  { key: "firstName", header: "First name", required: true, width: 18, example: "Nimal" },
  { key: "lastName", header: "Last name", required: true, width: 18, example: "Perera" },
  { key: "email", header: "Email", required: true, width: 32, example: "nimal.perera@company.com" },
  { key: "phone", header: "Phone", width: 18, example: "+94 77 123 4567" },
  { key: "department", header: "Department", required: true, width: 22, list: "departments" },
  { key: "designation", header: "Designation", required: true, width: 28, list: "designations" },
  { key: "joiningDate", header: "Joining date", required: true, width: 16, example: "2026-10-01", note: "YYYY-MM-DD, or an Excel date" },
  { key: "status", header: "Status", width: 16, list: "statuses", defaultValue: "Active" },
  { key: "employmentType", header: "Employment type", width: 18, list: "employmentTypes", defaultValue: "Full-time" },
  { key: "workLocation", header: "Work location", width: 18, list: "workLocations", defaultValue: "Colombo HQ" },
  { key: "reportingManagerEmail", header: "Reporting manager email", width: 30, example: "lead@company.com", note: "Must be an existing employee, or another row in this sheet" },
  { key: "createLogin", header: "Create login", width: 14, list: "yesNo", defaultValue: "Yes" },
  { key: "userType", header: "User type", width: 18, list: "userTypes", defaultValue: "Employee" }
];

const normaliseHeader = (value) =>
  String(value ?? "")
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/\*/g, "")
    .replace(/[^a-z]/g, "");

const HEADER_INDEX = new Map(COLUMNS.map((column) => [normaliseHeader(column.header), column.key]));
HEADER_INDEX.set("firstname", "firstName");
HEADER_INDEX.set("name", "firstName");
HEADER_INDEX.set("surname", "lastName");
HEADER_INDEX.set("emailaddress", "email");
HEADER_INDEX.set("mail", "email");
HEADER_INDEX.set("mobile", "phone");
HEADER_INDEX.set("phonenumber", "phone");
HEADER_INDEX.set("number", "phone");
HEADER_INDEX.set("joindate", "joiningDate");
HEADER_INDEX.set("dateofjoining", "joiningDate");
HEADER_INDEX.set("managermail", "reportingManagerEmail");
HEADER_INDEX.set("reportingmanager", "reportingManagerEmail");
HEADER_INDEX.set("login", "createLogin");
HEADER_INDEX.set("role", "userType");

const pad = (value) => String(value).padStart(2, "0");
const isoDate = (date) => `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;

// Excel serials count days from 1899-12-30.
const serialToIso = (serial) => isoDate(new Date(Math.round((serial - 25569) * 86400000)));

const plain = (value) => {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return isoDate(value);
  if (typeof value === "object") {
    if (Array.isArray(value.richText)) return value.richText.map((part) => part.text).join("").trim();
    if (value.text !== undefined) return String(value.text).trim();
    if (value.result !== undefined) return plain(value.result);
    if (value.hyperlink && !value.text) return String(value.hyperlink).replace(/^mailto:/i, "").trim();
    return "";
  }
  return String(value).trim();
};

const matchOption = (value, options) => {
  if (!value) return null;
  const wanted = value.toLowerCase();
  return options.find((option) => option.toLowerCase() === wanted) ?? null;
};

/* ----------------------------- template ----------------------------- */

const buildTemplate = ({ departments, designations, userTypes }) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "ARA Workspace";
  workbook.created = new Date();

  const lists = {
    departments,
    designations,
    statuses: EMPLOYMENT_STATUSES,
    employmentTypes: EMPLOYMENT_TYPES,
    workLocations: WORK_LOCATIONS,
    yesNo: ["Yes", "No"],
    userTypes: userTypes.map((type) => type.name)
  };

  const sheet = workbook.addWorksheet(SHEET_NAME, { views: [{ state: "frozen", ySplit: 1 }] });
  sheet.columns = COLUMNS.map((column) => ({
    key: column.key,
    width: column.width,
    style: { alignment: { vertical: "middle" } }
  }));

  const headerRow = sheet.getRow(1);
  COLUMNS.forEach((column, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = column.required ? `${column.header} *` : column.header;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: column.required ? "FF2563EB" : "FF64748B" } };
    cell.alignment = { vertical: "middle", wrapText: true };
    cell.border = { bottom: { style: "thin", color: { argb: "FF1D4ED8" } } };
    const hints = [];
    if (column.required) hints.push("Required.");
    if (column.list) hints.push("Pick from the dropdown.");
    if (column.defaultValue) hints.push(`Defaults to "${column.defaultValue}" when empty.`);
    if (column.note) hints.push(column.note);
    if (column.example) hints.push(`Example: ${column.example}`);
    cell.note = { texts: [{ text: hints.join(" ") }], margins: { insetmode: "auto" } };
  });
  headerRow.height = 28;

  const listsSheet = workbook.addWorksheet(LISTS_SHEET, { state: "veryHidden" });
  const listColumns = {};
  Object.entries(lists).forEach(([name, values], index) => {
    const letter = String.fromCharCode(65 + index);
    listsSheet.getCell(`${letter}1`).value = name;
    values.forEach((value, rowIndex) => {
      listsSheet.getCell(`${letter}${rowIndex + 2}`).value = value;
    });
    listColumns[name] = { letter, count: values.length };
  });

  COLUMNS.forEach((column, index) => {
    if (!column.list) return;
    const source = listColumns[column.list];
    if (!source || source.count === 0) return;
    const letter = sheet.getColumn(index + 1).letter;
    sheet.dataValidations.add(`${letter}2:${letter}${MAX_ROWS + 1}`, {
      type: "list",
      allowBlank: !column.required,
      formulae: [`${LISTS_SHEET}!$${source.letter}$2:$${source.letter}$${source.count + 1}`],
      showErrorMessage: true,
      errorStyle: "stop",
      errorTitle: "Not in the list",
      error: `Choose one of the ${column.header.toLowerCase()} values from the dropdown.`
    });
  });

  sheet.getColumn(COLUMNS.findIndex((column) => column.key === "joiningDate") + 1).numFmt = "yyyy-mm-dd";
  sheet.getColumn(COLUMNS.findIndex((column) => column.key === "phone") + 1).numFmt = "@";

  const help = workbook.addWorksheet("How to fill this in");
  help.columns = [{ width: 30 }, { width: 90 }];
  const lines = [
    ["ARA Workspace — employee import", ""],
    ["", ""],
    ["1. Fill the Employees sheet", "One person per row, starting on row 2. Do not change or reorder the header row."],
    ["2. Required columns", COLUMNS.filter((column) => column.required).map((column) => column.header).join(", ")],
    ["3. Dropdown columns", "Department, Designation, Status, Employment type, Work location, Create login and User type only accept the values in their dropdown. They reflect what is set up in ARA Workspace right now."],
    ["4. Joining date", "Type it as YYYY-MM-DD (for example 2026-10-01) or pick a date in Excel — both work."],
    ["5. Reporting manager", "Enter the manager's email. It can be an existing employee or another person in this same sheet."],
    ["6. Logins", `"Create login" = Yes creates a sign-in for that person with a temporary password. The passwords are shown once, on the import results screen, and everyone must change theirs at first sign-in. Leave User type empty for "${COLUMNS.find((column) => column.key === "userType").defaultValue}".`],
    ["7. Upload", `Save the file and upload it on Employees → Import from Excel. Rows with problems are listed before anything is created; nothing is saved until you confirm. Up to ${MAX_ROWS} rows per file.`]
  ];
  lines.forEach(([label, text], index) => {
    const row = help.getRow(index + 1);
    row.getCell(1).value = label;
    row.getCell(2).value = text;
    row.getCell(1).font = { bold: true, size: index === 0 ? 14 : 11 };
    row.getCell(2).alignment = { wrapText: true, vertical: "top" };
  });

  return workbook.xlsx.writeBuffer();
};

/* ------------------------------ parsing ------------------------------ */

const parseWorkbook = async (buffer) => {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer);
  } catch {
    return { error: "That file could not be read. Upload the .xlsx template, filled in." };
  }

  const sheet = workbook.getWorksheet(SHEET_NAME) ?? workbook.worksheets.find((candidate) => candidate.state !== "veryHidden");
  if (!sheet || sheet.rowCount < 1) return { error: "The workbook has no Employees sheet." };

  const headerRow = sheet.getRow(1);
  const mapping = [];
  headerRow.eachCell({ includeEmpty: false }, (cell, columnNumber) => {
    const key = HEADER_INDEX.get(normaliseHeader(plain(cell.value)));
    if (key) mapping.push({ columnNumber, key });
  });

  const found = new Set(mapping.map((entry) => entry.key));
  const missing = COLUMNS.filter((column) => column.required && !found.has(column.key)).map((column) => column.header);
  if (missing.length > 0) {
    return { error: `These required columns are missing from the header row: ${missing.join(", ")}. Download the template again and keep its headers.` };
  }

  const rows = [];
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;
    const data = {};
    let hasValue = false;
    mapping.forEach(({ columnNumber, key }) => {
      const cell = row.getCell(columnNumber);
      let value = plain(cell.value);
      if (key === "joiningDate" && typeof cell.value === "number") value = serialToIso(cell.value);
      if (key === "phone" && typeof cell.value === "number") value = String(cell.value);
      if (value) hasValue = true;
      data[key] = value;
    });
    if (hasValue) rows.push({ rowNumber, data });
  });

  if (rows.length === 0) return { error: "The sheet has no employee rows under the header." };
  if (rows.length > MAX_ROWS) return { error: `Up to ${MAX_ROWS} rows per file — this one has ${rows.length}. Split it and import in parts.` };

  return { rows, columns: mapping.map((entry) => entry.key) };
};

/* ----------------------------- validation ---------------------------- */

const validateRows = (rows, { departments, designations, userTypes, existingByEmail, managerIdByEmail = existingByEmail, canCreateLogins }) => {
  const defaultType = userTypes.find((type) => type.name.toLowerCase() === "employee") ?? userTypes[0];
  const emailsInFile = new Map();
  rows.forEach((row) => {
    const email = row.data.email?.toLowerCase();
    if (email) emailsInFile.set(email, (emailsInFile.get(email) ?? 0) + 1);
  });

  return rows.map(({ rowNumber, data }) => {
    const errors = {};
    const warnings = [];
    const clean = {
      firstName: data.firstName ?? "",
      lastName: data.lastName ?? "",
      email: (data.email ?? "").toLowerCase(),
      phone: data.phone || null,
      department: null,
      designation: null,
      joiningDate: data.joiningDate ?? "",
      status: "Active",
      employmentType: "Full-time",
      workLocation: "Colombo HQ",
      reportingManagerEmail: (data.reportingManagerEmail ?? "").toLowerCase() || null,
      createLogin: true,
      userTypeId: defaultType?.id ?? null,
      userTypeName: defaultType?.name ?? null
    };

    if (!clean.firstName) errors.firstName = "First name is required.";
    if (!clean.lastName) {
      const parts = clean.firstName.split(/\s+/);
      if (parts.length > 1) {
        clean.lastName = parts.slice(1).join(" ");
        clean.firstName = parts[0];
        warnings.push("Last name was taken from the first-name cell.");
      } else errors.lastName = "Last name is required.";
    }

    if (!clean.email) errors.email = "Email is required.";
    else if (!EMAIL_PATTERN.test(clean.email)) errors.email = "That is not a valid email address.";
    else if (emailsInFile.get(clean.email) > 1) errors.email = "This email appears more than once in the file.";

    const department = matchOption(data.department, departments);
    if (!data.department) errors.department = "Department is required.";
    else if (!department) errors.department = `"${data.department}" is not an active department.`;
    else clean.department = department;

    const designation = matchOption(data.designation, designations);
    if (!data.designation) errors.designation = "Designation is required.";
    else if (!designation) errors.designation = `"${data.designation}" is not an active designation.`;
    else clean.designation = designation;

    if (!clean.joiningDate) errors.joiningDate = "Joining date is required.";
    else if (!DATE_PATTERN.test(clean.joiningDate) || Number.isNaN(Date.parse(clean.joiningDate))) {
      errors.joiningDate = "Joining date must be YYYY-MM-DD.";
    }

    const status = matchOption(data.status, EMPLOYMENT_STATUSES);
    if (data.status && !status) errors.status = `"${data.status}" is not a valid status.`;
    else if (status) clean.status = status;

    const employmentType = matchOption(data.employmentType, EMPLOYMENT_TYPES);
    if (data.employmentType && !employmentType) errors.employmentType = `"${data.employmentType}" is not a valid employment type.`;
    else if (employmentType) clean.employmentType = employmentType;

    const workLocation = matchOption(data.workLocation, WORK_LOCATIONS);
    if (data.workLocation && !workLocation) errors.workLocation = `"${data.workLocation}" is not a valid work location.`;
    else if (workLocation) clean.workLocation = workLocation;

    if (clean.reportingManagerEmail) {
      if (clean.reportingManagerEmail === clean.email) errors.reportingManagerEmail = "Someone cannot report to themselves.";
      else if (!managerIdByEmail.has(clean.reportingManagerEmail) && !emailsInFile.has(clean.reportingManagerEmail)) {
        errors.reportingManagerEmail = `No employee with the email ${clean.reportingManagerEmail}.`;
      }
    }

    const loginText = (data.createLogin ?? "").toLowerCase();
    if (YES.has(loginText) || loginText === "") clean.createLogin = true;
    else if (NO.has(loginText)) clean.createLogin = false;
    else errors.createLogin = 'Create login must be "Yes" or "No".';

    if (data.userType) {
      const type = userTypes.find((candidate) => candidate.name.toLowerCase() === data.userType.toLowerCase());
      if (!type) errors.userType = `"${data.userType}" is not a user type.`;
      else {
        clean.userTypeId = type.id;
        clean.userTypeName = type.name;
      }
    }

    if (clean.createLogin && !canCreateLogins) {
      clean.createLogin = false;
      warnings.push("Logins are not created because your role cannot manage accounts — the employee is still added.");
    }

    let status_ = "ready";
    if (Object.keys(errors).length > 0) status_ = "error";
    else if (existingByEmail.has(clean.email)) status_ = "exists";

    return { rowNumber, data: clean, raw: data, errors, warnings, status: status_ };
  });
};

const summarise = (rows) => ({
  total: rows.length,
  ready: rows.filter((row) => row.status === "ready").length,
  errors: rows.filter((row) => row.status === "error").length,
  exists: rows.filter((row) => row.status === "exists").length,
  logins: rows.filter((row) => row.status === "ready" && row.data.createLogin).length
});

module.exports = {
  COLUMNS,
  MAX_ROWS,
  buildTemplate,
  parseWorkbook,
  validateRows,
  summarise
};
