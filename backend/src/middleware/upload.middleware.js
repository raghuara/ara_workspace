// multer parses "multipart/form-data" (file uploads). Files are held in
// memory as a Buffer just long enough to hand them to the storage driver.
const multer = require("multer");

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

const ALLOWED_TYPES = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "application/pdf": ".pdf",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "application/vnd.ms-excel": ".xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx"
};

const fileFilter = (req, file, callback) => {
  if (ALLOWED_TYPES[file.mimetype]) return callback(null, true);

  const error = new multer.MulterError("LIMIT_UNEXPECTED_FILE", file.fieldname);
  error.message = "Only images (JPG, PNG, WEBP, GIF), PDF, Word and Excel files are allowed.";
  callback(error);
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES, files: 1 },
  fileFilter
});

module.exports = {
  upload,
  ALLOWED_TYPES,
  MAX_FILE_BYTES
};
