const path = require("path");
const crypto = require("crypto");
const storage = require("../services/storage");
const attachmentModel = require("../models/attachment.model");
const employeeModel = require("../models/employee.model");
const { ALLOWED_TYPES } = require("../middleware/upload.middleware");

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB for images, 10 MB for documents
const URL_TTL_SECONDS = 15 * 60;

// Which permission each owner type needs, for reading and for changing.
const OWNER_TYPES = {
  employee: { view: "employee.view", update: "employee.update" },
  task: { view: "task.view", update: "task.update" },
  ticket: { view: "ticket.view", update: "ticket.manage" }
};

const formatSize = (bytes) => {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
};

const mapAttachment = async (row) => ({
  id: row.id,
  ownerType: row.owner_type,
  ownerId: row.owner_id,
  employeeId: row.owner_type === "employee" ? row.owner_id : undefined,
  name: row.file_name,
  category: row.category,
  mimeType: row.mime_type,
  sizeBytes: row.size_bytes,
  sizeLabel: formatSize(row.size_bytes),
  uploadedOn: row.created_on,
  url: await storage.getUrl(row.storage_key, {
    expiresInSeconds: URL_TTL_SECONDS,
    fileName: row.file_name
  }),
  downloadUrl: await storage.getUrl(row.storage_key, {
    expiresInSeconds: URL_TTL_SECONDS,
    fileName: row.file_name,
    download: true
  })
});

const can = (req, permission) => (req.permissions || []).includes(permission);

// Make sure the thing the file is attached to exists. Tasks are not in the
// database yet, so only the id format is checked for them.
const ownerExists = async (ownerType, ownerId) => {
  if (ownerType === "employee") return Boolean(await employeeModel.findEmployeeById(ownerId));
  return /^[A-Za-z0-9-]{1,40}$/.test(ownerId);
};

const uploadAttachment = async (req, res) => {
  const ownerType = String(req.body.ownerType || "").trim();
  const ownerId = String(req.body.ownerId || "").trim();
  const category = String(req.body.category || "").trim() || null;
  const file = req.file;

  if (!OWNER_TYPES[ownerType]) {
    return res.status(400).json({ message: "ownerType must be employee, task or ticket.", code: "BAD_REQUEST" });
  }
  if (!ownerId) {
    return res.status(400).json({ message: "ownerId is required.", code: "BAD_REQUEST" });
  }
  if (!file) {
    return res.status(400).json({ message: "Choose a file to upload.", code: "BAD_REQUEST" });
  }
  if (!can(req, OWNER_TYPES[ownerType].update)) {
    return res.status(403).json({ message: "You do not have permission to do this.", code: "FORBIDDEN" });
  }
  if (file.mimetype.startsWith("image/") && file.size > MAX_IMAGE_BYTES) {
    return res.status(413).json({ message: "Images must be 5 MB or smaller.", code: "FILE_TOO_LARGE" });
  }
  if (!(await ownerExists(ownerType, ownerId))) {
    return res.status(404).json({ message: `That ${ownerType} does not exist.`, code: "NOT_FOUND" });
  }

  // Key = where the bytes live in storage. A random name prevents clashes and
  // stops anyone guessing another file's link from its original name.
  const extension = ALLOWED_TYPES[file.mimetype] || path.extname(file.originalname).toLowerCase();
  const storageKey = `${ownerType}/${ownerId}/${crypto.randomUUID()}${extension}`;

  await storage.upload({ key: storageKey, buffer: file.buffer, contentType: file.mimetype });

  const created = await attachmentModel.createAttachment({
    ownerType,
    ownerId,
    category,
    fileName: path.basename(file.originalname).slice(0, 255),
    storageKey,
    mimeType: file.mimetype,
    sizeBytes: file.size,
    uploadedBy: req.user.userId
  });

  res.status(201).json(await mapAttachment(created));
};

const listAttachments = async (req, res) => {
  const ownerType = String(req.query.ownerType || "").trim();
  const ownerId = String(req.query.ownerId || "").trim();

  if (!OWNER_TYPES[ownerType] || !ownerId) {
    return res.status(400).json({ message: "ownerType and ownerId are required.", code: "BAD_REQUEST" });
  }
  if (!can(req, OWNER_TYPES[ownerType].view)) {
    return res.status(403).json({ message: "You do not have permission to view these files.", code: "FORBIDDEN" });
  }

  const rows = await attachmentModel.findAttachmentsByOwner(ownerType, ownerId);
  res.json(await Promise.all(rows.map(mapAttachment)));
};

const deleteAttachment = async (req, res) => {
  const attachment = await attachmentModel.findAttachmentById(req.params.id);

  if (!attachment) {
    return res.status(404).json({ message: "That file does not exist.", code: "NOT_FOUND" });
  }
  if (!can(req, OWNER_TYPES[attachment.owner_type]?.update)) {
    return res.status(403).json({ message: "You do not have permission to delete this file.", code: "FORBIDDEN" });
  }

  await storage.remove(attachment.storage_key);
  await attachmentModel.deleteAttachment(attachment.id);
  res.status(204).end();
};

// Serves a file from local disk when the storage driver is "local". The link
// carries its own signature + expiry (see local.driver.js), so no login needed.
const downloadLocalFile = (req, res) => {
  const { key, expires, sig } = req.query;

  if (storage.name !== "local" || !storage.verifySignedKey(key, expires, sig)) {
    return res.status(404).json({ message: "This link is invalid or has expired.", code: "NOT_FOUND" });
  }

  const headers = req.query.download === "1"
    ? { "Content-Disposition": `attachment; filename="${path.basename(key)}"` }
    : undefined;

  res.sendFile(storage.toPath(key), { headers }, (error) => {
    if (error && !res.headersSent) {
      res.status(404).json({ message: "File not found.", code: "NOT_FOUND" });
    }
  });
};

module.exports = {
  uploadAttachment,
  listAttachments,
  deleteAttachment,
  downloadLocalFile
};
