const crypto = require('crypto');

// random token that's basically impossible to guess, for the email links (64 hex chars)
exports.newToken = () => crypto.randomBytes(32).toString('hex');

// password reset tokens get stored HASHED, so even if someone could read the db
// they still couldn't use a pending reset link. the email has the plain token,
// and when it comes back we hash it and compare
exports.hashToken = (token) => crypto.createHash('sha256').update(String(token)).digest('hex');

// how long a reset link works for
exports.RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
