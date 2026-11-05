const express = require('express');
const auth = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// login + the email stuff are "actions" more than resources, so these are
// the usual exception to the nouns-only REST url thing

// POST /api/auth/login - check username + password, get a token back
router.post('/login', auth.login);

// ADD THIS ROUTE: POST /api/auth/register - sign up a new teacher with student + behaviors
router.post('/register', auth.register);

// GET /api/auth/me - who's logged in right now (needs the token)
router.get('/me', requireAuth, auth.me);

// email verification. the link in the email has ?token= on it
router.post('/verify-email', auth.verifyEmail);
router.get('/verify-email', auth.verifyEmail);
router.post('/resend-verification', auth.resendVerification);

// password reset: first ask for a link, then send the token + new password
router.post('/forgot-password', auth.forgotPassword);
router.post('/reset-password', auth.resetPassword);

module.exports = router;
