const nodemailer = require('nodemailer');

// sends the account emails (verify your email, reset password) through any SMTP
// server: SendGrid, Mailgun, Brevo, a gmail app password, whatever.
//
// if SMTP_HOST isn't set in .env, nothing actually gets sent. the email just gets
// printed to the server log instead (see it with `pm2 logs api`), which is good
// enough for testing the flows / demoing
const {
  SMTP_HOST,
  SMTP_PORT = '587',
  SMTP_USER,
  SMTP_PASS,
  EMAIL_FROM = 'Behavior Tracker <no-reply@example.com>'
} = process.env;

const transporter = SMTP_HOST
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      secure: SMTP_PORT === '465',
      auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined
    })
  : null;

// where the links in the emails go.
// APP_URL = our react site, which needs /verify-email and /reset-password pages
// that grab ?token= from the url and send it to the API.
// if APP_URL isn't set, the verify link just goes straight to the API instead
// (GET /api/auth/verify-email?token=...), so it works even without a front end
const appUrl = () => (process.env.APP_URL || '').replace(/\/$/, '');

async function send(to, subject, text) {
  if (!transporter) {
    console.log(`\n[email not sent: SMTP_HOST is not set]\nTo: ${to}\nSubject: ${subject}\n\n${text}\n`);
    return;
  }
  await transporter.sendMail({ from: EMAIL_FROM, to, subject, text });
}

// apiBase = this API's own address, like https://mernbehaviortracker.xyz:5000
exports.sendVerificationEmail = (user, token, apiBase) => {
  const link = appUrl()
    ? `${appUrl()}/verify-email?token=${token}`
    : `${apiBase}/api/auth/verify-email?token=${token}`;

  return send(
    user.email,
    'Verify your Behavior Tracker account',
    `Hi ${user.firstName},\n\nPlease confirm your email address by opening this link:\n${link}\n\n` +
      "If you didn't create a Behavior Tracker account, you can ignore this email."
  );
};

exports.sendPasswordResetEmail = (user, token) => {
  const base = appUrl() || 'http://localhost:5173';
  const link = `${base}/reset-password?token=${token}`;

  return send(
    user.email,
    'Reset your Behavior Tracker password',
    `Hi ${user.firstName},\n\nTo choose a new password, open this link within 1 hour:\n${link}\n\n` +
      "If you didn't ask to reset your password, you can ignore this email. Your password won't change."
  );
};

// figures out the API's public address from the incoming request
exports.apiBaseFrom = (req) => `${req.protocol}://${req.get('host')}`;
