// Local-disk driver: files go to backend/uploads/. Used on machines without
// Azure credentials. Download links are signed and expire, so a private file
// can be opened by <img> / <a> without an Authorization header.
const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, "../../../uploads"));
const API_URL = (process.env.API_URL || "http://localhost:5000").replace(/\/$/, "");

const toPath = (key) => {
  const full = path.resolve(UPLOAD_DIR, key);
  if (!full.startsWith(UPLOAD_DIR + path.sep)) throw new Error("Invalid storage key");
  return full;
};

const sign = (key, expires) =>
  crypto.createHmac("sha256", process.env.JWT_SECRET).update(`${key}:${expires}`).digest("hex");

const upload = async ({ key, buffer }) => {
  const target = toPath(key);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, buffer);
};

const getUrl = async (key, { expiresInSeconds = 900, download = false } = {}) => {
  const expires = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const query = new URLSearchParams({ key, expires: String(expires), sig: sign(key, expires) });
  if (download) query.set("download", "1");
  return `${API_URL}/api/attachments/file?${query.toString()}`;
};

const remove = async (key) => {
  await fs.rm(toPath(key), { force: true });
};

// Used by the download route to check a signed link is genuine and not expired.
const verifySignedKey = (key, expires, sig) => {
  if (!key || !expires || !sig) return false;
  if (Number(expires) < Math.floor(Date.now() / 1000)) return false;
  const expected = sign(key, expires);
  return expected.length === sig.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
};

module.exports = {
  name: "local",
  upload,
  getUrl,
  remove,
  verifySignedKey,
  toPath
};
