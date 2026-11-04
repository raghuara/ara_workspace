const jwt = require("jsonwebtoken");

// A session lasts as long as someone keeps working. The token itself is good
// for IDLE_WINDOW, and every request made after REFRESH_AFTER_SECONDS hands
// back a fresh one — so an active person is never logged out, while a token
// left untouched for the whole window simply lapses.
const IDLE_WINDOW = "14d";
const REFRESH_AFTER_SECONDS = 60 * 60;

const signSession = ({ userId, employeeId, userTypeId }) =>
  jwt.sign({ userId, employeeId, userTypeId }, process.env.JWT_SECRET, { expiresIn: IDLE_WINDOW });

const needsRefresh = (payload) =>
  typeof payload?.iat === "number" && Math.floor(Date.now() / 1000) - payload.iat >= REFRESH_AFTER_SECONDS;

/** True when the password changed (or an admin revoked sessions) after this token was issued. */
const isRevoked = (user, payload) => {
  if (!user?.sessions_valid_from || typeof payload?.iat !== "number") return false;
  const validFrom = new Date(user.sessions_valid_from).getTime();
  if (Number.isNaN(validFrom)) return false;
  // JWT seconds are floored, so allow the second the token was minted in.
  return payload.iat * 1000 < validFrom - 1000;
};

module.exports = { IDLE_WINDOW, REFRESH_AFTER_SECONDS, signSession, needsRefresh, isRevoked };
