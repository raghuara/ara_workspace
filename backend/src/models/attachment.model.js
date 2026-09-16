const pool = require("../config/database");

const ATTACHMENT_SELECT = `
  SELECT
    id,
    owner_type,
    owner_id,
    category,
    file_name,
    storage_key,
    mime_type,
    size_bytes,
    uploaded_by,
    DATE_FORMAT(created_at, '%Y-%m-%d') AS created_on
  FROM attachments
`;

const findAttachmentById = async (id) => {
  const [rows] = await pool.query(`${ATTACHMENT_SELECT} WHERE id = ? LIMIT 1`, [id]);
  return rows[0] || null;
};

const createAttachment = async (attachment) => {
  const [result] = await pool.query(
    `INSERT INTO attachments
       (owner_type, owner_id, category, file_name, storage_key, mime_type, size_bytes, uploaded_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      attachment.ownerType,
      attachment.ownerId,
      attachment.category,
      attachment.fileName,
      attachment.storageKey,
      attachment.mimeType,
      attachment.sizeBytes,
      attachment.uploadedBy
    ]
  );

  return findAttachmentById(result.insertId);
};

const findAttachmentsByOwner = async (ownerType, ownerId) => {
  const [rows] = await pool.query(
    `${ATTACHMENT_SELECT} WHERE owner_type = ? AND owner_id = ? ORDER BY created_at DESC, id DESC`,
    [ownerType, ownerId]
  );
  return rows;
};

const deleteAttachment = async (id) => {
  await pool.query("DELETE FROM attachments WHERE id = ?", [id]);
};

module.exports = {
  createAttachment,
  findAttachmentById,
  findAttachmentsByOwner,
  deleteAttachment
};
