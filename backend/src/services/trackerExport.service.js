const ExcelJS = require("exceljs");

const MAX_COLUMNS = 40;
const MAX_ROWS = 10000;
const MAX_DETAIL_ROWS = 5000;
const MAX_TEXT = 500;

const TONES = {
  blue: { soft: "FFEFF6FF", tint: "FFE5F0FE", strong: "FF1D4ED8" },
  green: { soft: "FFDCFCE7", tint: "FFE6FCED", strong: "FF15803D" },
  amber: { soft: "FFFEF3C7", tint: "FFFEF7D9", strong: "FFB45309" },
  rose: { soft: "FFFFE4E6", tint: "FFFFEAEC", strong: "FFBE123C" },
  violet: { soft: "FFF5F3FF", tint: "FFEFEBFE", strong: "FF6D28D9" },
  teal: { soft: "FFF0FDFA", tint: "FFE0FBF5", strong: "FF0F766E" },
  orange: { soft: "FFFFF7ED", tint: "FFFFF2E1", strong: "FFC2410C" },
  slate: { soft: "FFF1F5F9", tint: "FFEAEFF5", strong: "FF475569" }
};

const NAVY = "FF173B6C";
const BRAND = "FF2563EB";
const BORDER = "FFE2E8F0";
const ZEBRA = "FFF8FAFC";
const BAND = "FFEFF6FF";
const TOTAL = "FFDBEAFE";

const KINDS = new Set(["text", "count", "percent"]);
const ROW_STYLES = new Set(["row", "band", "total"]);

const fail = (message) => ({ error: message });

const cleanText = (value, max = MAX_TEXT) => (typeof value === "string" ? value.slice(0, max) : "");

const cleanTone = (value) => (typeof value === "string" && TONES[value] ? value : null);

const cleanCell = (value) => {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") return value.slice(0, MAX_TEXT);
  return null;
};

const validate = (body) => {
  if (!body || typeof body !== "object") return fail("Nothing to export.");
  const title = cleanText(body.title, 200).trim() || "Daily task tracker";
  const subtitle = cleanText(body.subtitle, 300);
  const sheetName = cleanText(body.sheetName, 31).replace(/[\\/?*[\]:]/g, "").trim() || "Tracker";

  if (!Array.isArray(body.columns) || body.columns.length === 0 || body.columns.length > MAX_COLUMNS) {
    return fail(`Send between 1 and ${MAX_COLUMNS} columns.`);
  }
  const columns = body.columns.map((column) => ({
    label: cleanText(column?.label, 80) || "Column",
    kind: KINDS.has(column?.kind) ? column.kind : "text",
    width: Number.isFinite(column?.width) ? Math.min(Math.max(column.width, 6), 60) : null,
    section: cleanText(column?.section, 40),
    sectionTone: cleanTone(column?.sectionTone),
    shade: cleanTone(column?.shade)
  }));

  if (!Array.isArray(body.rows) || body.rows.length > MAX_ROWS) return fail(`Send at most ${MAX_ROWS} rows.`);
  const rows = [];
  for (const row of body.rows) {
    if (!Array.isArray(row?.cells) || row.cells.length !== columns.length) {
      return fail("Every row needs exactly one value per column.");
    }
    const notes = {};
    if (row.notes && typeof row.notes === "object") {
      Object.entries(row.notes).forEach(([index, text]) => {
        const position = Number(index);
        if (Number.isInteger(position) && position >= 0 && position < columns.length && typeof text === "string") {
          notes[position] = text.slice(0, 1000);
        }
      });
    }
    rows.push({
      cells: row.cells.map(cleanCell),
      style: ROW_STYLES.has(row.style) ? row.style : "row",
      group: Number.isInteger(row.group) ? row.group : rows.length,
      notes
    });
  }

  let details = null;
  if (body.details && Array.isArray(body.details.columns) && Array.isArray(body.details.rows)) {
    const detailColumns = body.details.columns.slice(0, 12).map((label) => cleanText(label, 60) || "Column");
    details = {
      columns: detailColumns,
      rows: body.details.rows
        .slice(0, MAX_DETAIL_ROWS)
        .filter((row) => Array.isArray(row))
        .map((row) => detailColumns.map((_, index) => cleanCell(row[index]))),
      truncated: Boolean(body.details.truncated) || body.details.rows.length > MAX_DETAIL_ROWS
    };
  }

  return { title, subtitle, sheetName, columns, rows, details };
};

const fillCell = (cell, argb) => {
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb } };
};

const thinBorder = { style: "thin", color: { argb: BORDER } };
const borderAll = { top: thinBorder, left: thinBorder, bottom: thinBorder, right: thinBorder };

const percentTone = (value) => (value === null ? null : value >= 100 ? "green" : value >= 80 ? "amber" : "rose");

const addTitle = (sheet, text, subtitle, width) => {
  sheet.mergeCells(1, 1, 1, width);
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = text;
  titleCell.font = { bold: true, size: 16, color: { argb: "FFFFFFFF" } };
  titleCell.alignment = { vertical: "middle", indent: 1 };
  fillCell(titleCell, NAVY);
  sheet.getRow(1).height = 30;

  sheet.mergeCells(2, 1, 2, width);
  const subtitleCell = sheet.getCell(2, 1);
  subtitleCell.value = subtitle;
  subtitleCell.font = { italic: true, size: 10, color: { argb: "FF64748B" } };
  subtitleCell.alignment = { vertical: "middle", indent: 1 };
  sheet.getRow(2).height = 18;
};

const buildTrackerSheet = (workbook, data) => {
  const { columns, rows } = data;
  const sheet = workbook.addWorksheet(data.sheetName, {
    views: [{ state: "frozen", xSplit: 0, ySplit: 4, topLeftCell: "A5", activeCell: "A5" }]
  });
  addTitle(sheet, data.title, data.subtitle, columns.length);

  let start = 0;
  while (start < columns.length) {
    let end = start;
    while (end + 1 < columns.length && columns[end + 1].section === columns[start].section) end += 1;
    if (end > start) sheet.mergeCells(3, start + 1, 3, end + 1);
    const cell = sheet.getCell(3, start + 1);
    cell.value = columns[start].section || null;
    if (columns[start].section) {
      const tone = TONES[columns[start].sectionTone ?? "blue"];
      cell.font = { bold: true, size: 9, color: { argb: tone.strong } };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      fillCell(cell, tone.tint);
    }
    start = end + 1;
  }
  sheet.getRow(3).height = 18;

  const header = sheet.getRow(4);
  columns.forEach((column, index) => {
    const cell = header.getCell(index + 1);
    cell.value = column.kind === "text" ? column.label : column.label.replace(" (", "\n(").replace(/^(\S+) (\S+)$/, "$1\n$2");
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.alignment = { horizontal: column.kind === "text" ? "left" : "center", vertical: "middle", wrapText: true };
    cell.border = { ...borderAll, bottom: { style: "medium", color: { argb: NAVY } } };
    fillCell(cell, BRAND);
    const minimum = column.kind === "text" ? 10 : column.kind === "percent" ? 17 : 15;
    sheet.getColumn(index + 1).width = Math.max(column.width ?? 0, minimum);
  });
  header.height = 44;

  let lastGroup = null;
  let shade = false;
  rows.forEach((row, rowIndex) => {
    if (row.group !== lastGroup) {
      shade = !shade;
      lastGroup = row.group;
    }
    const excelRow = sheet.getRow(5 + rowIndex);
    row.cells.forEach((value, index) => {
      const column = columns[index];
      const cell = excelRow.getCell(index + 1);
      cell.border = borderAll;
      cell.alignment = { horizontal: column.kind === "text" ? "left" : "center", vertical: "middle" };

      if (column.kind === "percent") {
        cell.value = typeof value === "number" ? value / 100 : null;
        cell.numFmt = "0.0%";
        const tone = percentTone(typeof value === "number" ? value : null);
        if (tone) {
          fillCell(cell, TONES[tone].soft);
          cell.font = { bold: true, color: { argb: TONES[tone].strong } };
        }
      } else if (column.kind === "count") {
        cell.value = typeof value === "number" ? value : value === null ? 0 : value;
        if (column.shade && typeof value === "number" && value > 0) fillCell(cell, TONES[column.shade].soft);
        if (typeof value === "number" && value > 0) cell.font = { bold: true, color: { argb: "FF1D4ED8" } };
        else cell.font = { color: { argb: "FF94A3B8" } };
      } else {
        cell.value = value;
      }

      if (row.notes[index]) cell.note = row.notes[index];
      if (!cell.fill && row.style === "row" && shade) fillCell(cell, ZEBRA);
      if (row.style === "band") {
        fillCell(cell, BAND);
        cell.font = { ...(cell.font ?? {}), bold: true };
      }
      if (row.style === "total") {
        if (column.kind !== "percent") fillCell(cell, TOTAL);
        cell.font = { ...(cell.font ?? {}), bold: true, color: cell.font?.color ?? { argb: "FF172033" } };
        cell.border = { ...borderAll, top: { style: "medium", color: { argb: NAVY } } };
      }
    });
    excelRow.height = 20;
  });

  const dataRows = rows.filter((row) => row.style === "row").length;
  if (dataRows > 0) {
    sheet.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4 + rows.length, column: columns.length } };
  }
};

const buildDetailSheet = (workbook, data) => {
  const { details } = data;
  const sheet = workbook.addWorksheet("Details", {
    views: [{ state: "frozen", xSplit: 0, ySplit: 3, topLeftCell: "A4", activeCell: "A4" }]
  });
  const subtitle = details.truncated
    ? `${data.subtitle} · showing the first ${details.rows.length} items`
    : `${data.subtitle} · every task, client and ticket behind the counts`;
  addTitle(sheet, `${data.title} — details`, subtitle, details.columns.length);

  const header = sheet.getRow(3);
  details.columns.forEach((label, index) => {
    const cell = header.getCell(index + 1);
    cell.value = label;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.alignment = { vertical: "middle" };
    cell.border = borderAll;
    fillCell(cell, BRAND);
    sheet.getColumn(index + 1).width = index === 3 ? 48 : 18;
  });
  header.height = 22;

  details.rows.forEach((values, rowIndex) => {
    const row = sheet.getRow(4 + rowIndex);
    values.forEach((value, index) => {
      const cell = row.getCell(index + 1);
      cell.value = value;
      cell.border = borderAll;
      if (rowIndex % 2 === 1) fillCell(cell, ZEBRA);
    });
  });

  if (details.rows.length > 0) {
    sheet.autoFilter = { from: { row: 3, column: 1 }, to: { row: 3 + details.rows.length, column: details.columns.length } };
  }
};

const buildTrackerWorkbook = async (body) => {
  const data = validate(body);
  if (data.error) return data;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "ARA Workspace";
  workbook.created = new Date();
  buildTrackerSheet(workbook, data);
  if (data.details && data.details.rows.length > 0) buildDetailSheet(workbook, data);

  return { buffer: await workbook.xlsx.writeBuffer() };
};

module.exports = { buildTrackerWorkbook };
