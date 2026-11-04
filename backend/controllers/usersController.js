const crypto = require('crypto');
const { User } = require('../models');
const { createToken } = require('../middleware/auth');
const { pick } = require('../utils/body');
const { sendVerificationEmail, apiBaseFrom } = require('../utils/email');

const ROLES = ['teacher', 'parent'];

// POST /api/users   (this is register / sign up)
//   takes:   { firstName, lastName, email, login, password, role }
//            role is "teacher" or "parent" (defaults to teacher)
//   returns: 201 { message, token, user }  |  409 { error } taken  |  400 { error } bad input
//   db:      User.exists({ login }), User.exists({ email }), then insert with User.create
exports.createUser = async (req, res, next) => {
  try {
    const { firstName, lastName, email, login, password, role = 'teacher' } = req.body || {};

    if (!firstName || !lastName || !email || !login || !password) {
      return res
        .status(400)
        .json({ error: 'firstName, lastName, email, login, and password are required' });
    }

    // both roles can do the same things right now, so we let them pick.
    // anything else (like "admin") gets rejected
    if (!ROLES.includes(role)) {
      return res.status(400).json({ error: 'role must be "teacher" or "parent"' });
    }

    if (String(password).length < 8) {
      return res.status(400).json({ error: 'password must be at least 8 characters' });
    }

    const cleanLogin = String(login).trim().toLowerCase();
    const cleanEmail = String(email).trim().toLowerCase();

    if (await User.exists({ login: cleanLogin })) {
      return res.status(409).json({ error: 'A user with that login already exists' });
    }
    if (await User.exists({ email: cleanEmail })) {
      return res.status(409).json({ error: 'A user with that email already exists' });
    }

    // password gets hashed by the User model right before it saves.
    // new accounts start unverified, with a token for the verify-email link
    const verificationToken = crypto.randomBytes(16).toString('hex');
    const user = await User.create({
      firstName: String(firstName),
      lastName: String(lastName),
      email: cleanEmail,
      login: cleanLogin,
      password: String(password),
      role: role,
      isVerified: false,
      verificationToken: verificationToken
    });

    // if the email fails to send we still keep the account, they can just
    // ask for another one with POST /api/auth/resend-verification
    sendVerificationEmail(user, verificationToken, apiBaseFrom(req)).catch((err) =>
      console.error('Could not send verification email:', err.message)
    );

    // they're logged in right away, so we send a token back too
    res
      .status(201)
      .location(`/api/users/${user._id}`)
      .json({ message: 'User registered successfully', token: createToken(user), user });
  } catch (err) {
    next(err);
  }
};

// GET /api/users/:userId  (needs "Authorization: Bearer <token>")
//   returns: 200 user  |  401/403 { error }  |  404 { error }
//   db:      User.findById(userId)
exports.getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json(user);
  } catch (err) {
    next(err);
  }
};

// PATCH /api/users/:userId  (needs a token, only works on your own account)
//   takes:   any of { firstName, lastName, email }
//            to change the password send { currentPassword, newPassword }
//   returns: 200 user  |  400 { error }  |  401 wrong currentPassword  |  409 email taken
//   db:      User.findById, User.exists({ email }), then save
//   note: changing your email makes the account unverified again and sends a new link
exports.updateUser = async (req, res, next) => {
  try {
    // Updated pick keys to map directly from camelCase request body to camelCase database fields
    const updates = pick(req.body, { firstName: 'firstName', lastName: 'lastName', email: 'email' });
    const { currentPassword, newPassword } = req.body || {};

    if (Object.keys(updates).length === 0 && newPassword === undefined) {
      return res.status(400).json({ error: 'Send firstName, lastName, email, or currentPassword + newPassword' });
    }

    const user = await User.findById(req.params.userId).select('+password'); // Adjusted if schema option changed, otherwise matches field
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (newPassword !== undefined) {
      if (!currentPassword || !(await user.checkPassword(String(currentPassword)))) {
        return res.status(401).json({ error: 'currentPassword is incorrect' });
      }
      if (String(newPassword).length < 8) {
        return res.status(400).json({ error: 'newPassword must be at least 8 characters' });
      }
      user.password = String(newPassword); // gets hashed on save
    }

    let emailChanged = false;
    if (updates.email !== undefined) {
      updates.email = String(updates.email).trim().toLowerCase();
      if (updates.email !== user.email) {
        if (await User.exists({ email: updates.email, _id: { $ne: user._id } })) {
          return res.status(409).json({ error: 'A user with that email already exists' });
        }
        emailChanged = true;
      }
    }

    user.set(updates);
    let verificationToken;
    if (emailChanged) {
      verificationToken = crypto.randomBytes(16).toString('hex');
      user.isVerified = false;
      user.verificationToken = verificationToken;
    }
    await user.save();

    if (emailChanged) {
      sendVerificationEmail(user, verificationToken, apiBaseFrom(req)).catch((err) =>
        console.error('Could not send verification email:', err.message)
      );
    }

    res.status(200).json(user);
  } catch (err) {
    next(err);
  }
};
