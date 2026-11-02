const { User } = require('../models');
const { createToken } = require('../middleware/auth');
const { newToken, hashToken, RESET_TOKEN_TTL_MS } = require('../utils/tokens');
const { sendVerificationEmail, sendPasswordResetEmail, apiBaseFrom } = require('../utils/email');

// set REQUIRE_EMAIL_VERIFICATION=true in .env if we want to block login
// until the user clicks the link in their verification email
const requireVerification = () => process.env.REQUIRE_EMAIL_VERIFICATION === 'true';

// we send the same reply whether the email exists or not, so nobody can use
// these endpoints to figure out who has an account
const GENERIC_EMAIL_REPLY = 'If that email belongs to an account, a message has been sent to it';

// POST /api/auth/login
//   takes:   { "login": "jrivera", "password": "Password123!" }
//   returns: 200 { token, user }  |  401 { error } wrong login/pw  |  400 { error } missing fields
//            403 { error } if REQUIRE_EMAIL_VERIFICATION=true and they haven't verified yet
//   db:      Users.findOne({ Login }) (including the Password hash), then bcrypt.compare
exports.login = async (req, res, next) => {
  try {
    const { login, password } = req.body || {};

    if (!login || !password) {
      return res.status(400).json({ error: 'login and password are required' });
    }

    // the String() is important: without it someone could send {"login": {"$ne": null}}
    // and mongo would treat it as a query operator instead of a username (nosql injection).
    // logins are stored lowercase so we lowercase here too.
    // Password is hidden by default (select: false) so we have to ask for it
    const user = await User.findOne({ Login: String(login).trim().toLowerCase() }).select('+Password');

    // same error whether the username or the password was wrong, so it doesn't
    // give away which usernames actually exist
    if (!user || !(await user.checkPassword(String(password)))) {
      return res.status(401).json({ error: 'Invalid login or password' });
    }

    if (requireVerification() && !user.IsVerified) {
      return res.status(403).json({ error: 'Please verify your email address before logging in' });
    }

    res.status(200).json({ token: createToken(user), user });
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/me   (needs a token)
//   returns: 200 user  |  401 { error }  |  404 { error }
//   lets the web/mobile app turn a saved token back into "who's logged in" on reload
//   db:      Users.findById
exports.me = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.status(200).json(user);
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/verify-email   takes: { token }
// GET  /api/auth/verify-email?token=...   (the email link points here if APP_URL isn't set)
//   returns: 200 { message }  |  400 { error }
//   db:      Users.findOne({ VerificationToken }), then set IsVerified: true
exports.verifyEmail = async (req, res, next) => {
  try {
    const token = (req.body && req.body.token) || req.query.token;
    if (!token) return res.status(400).json({ error: 'token is required' });

    const user = await User.findOne({ VerificationToken: String(token) });
    if (!user) {
      return res.status(400).json({ error: 'This verification link is invalid or was already used' });
    }

    user.IsVerified = true;
    user.VerificationToken = null;
    await user.save();

    res.status(200).json({ message: 'Email verified. You can log in now.' });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/resend-verification   takes: { email }
//   returns: 200 { message }  (always, see GENERIC_EMAIL_REPLY above)
//   db:      Users.findOne({ Email }), then save a new VerificationToken
exports.resendVerification = async (req, res, next) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: 'email is required' });

    const user = await User.findOne({ Email: String(email).trim().toLowerCase() });
    if (user && !user.IsVerified) {
      const token = newToken();
      user.VerificationToken = token;
      await user.save();
      await sendVerificationEmail(user, token, apiBaseFrom(req));
    }

    res.status(200).json({ message: GENERIC_EMAIL_REPLY });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/forgot-password   takes: { email }
//   returns: 200 { message }  (always, see GENERIC_EMAIL_REPLY above)
//   db:      Users.findOne({ Email }), then save a HASHED ResetPasswordToken + expiry time
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: 'email is required' });

    const user = await User.findOne({ Email: String(email).trim().toLowerCase() });
    if (user) {
      const token = newToken();
      user.ResetPasswordToken = hashToken(token);
      user.ResetPasswordExpires = new Date(Date.now() + RESET_TOKEN_TTL_MS);
      await user.save();
      await sendPasswordResetEmail(user, token);
    }

    res.status(200).json({ message: GENERIC_EMAIL_REPLY });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/reset-password   takes: { token, password }
//   returns: 200 { message }  |  400 { error }
//   db:      Users.findOne({ ResetPasswordToken: hash(token), ResetPasswordExpires > now }),
//            then save the new (hashed) password and clear out the token
exports.resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body || {};

    if (!token || !password) {
      return res.status(400).json({ error: 'token and password are required' });
    }
    if (String(password).length < 8) {
      return res.status(400).json({ error: 'password must be at least 8 characters' });
    }

    const user = await User.findOne({
      ResetPasswordToken: hashToken(token),
      ResetPasswordExpires: { $gt: new Date() }
    });
    if (!user) {
      return res.status(400).json({ error: 'This reset link is invalid or has expired' });
    }

    user.Password = String(password); // the User model hashes this on save
    user.ResetPasswordToken = null;
    user.ResetPasswordExpires = null;
    await user.save();

    res.status(200).json({ message: 'Password updated. You can log in with your new password.' });
  } catch (err) {
    next(err);
  }
};
