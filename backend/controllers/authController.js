const { User, Student, Behavior } = require('../models');
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
//   db:      User.findOne({ login }) (including the password hash), then bcrypt.compare
exports.login = async (req, res, next) => {
  try {
    const { login, password } = req.body || {};

    if (!login || !password) {
      return res.status(400).json({ error: 'login and password are required' });
    }

    // the String() is important: without it someone could send {"login": {"$ne": null}}
    // and mongo would treat it as a query operator instead of a username (nosql injection).
    // logins are stored lowercase so we lowercase here too.
    // password is hidden by default (select: false) so we have to ask for it
    const user = await User.findOne({ login: String(login).trim().toLowerCase() }).select('+password');

    // same error whether the username or the password was wrong, so it doesn't
    // give away which usernames actually exist
    if (!user || !(await user.checkPassword(String(password)))) {
      return res.status(401).json({ error: 'Invalid login or password' });
    }

    if (requireVerification() && !user.isVerified) {
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
//   db:      User.findById
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
//   db:      User.findOne({ verificationToken }), then set isVerified: true
exports.verifyEmail = async (req, res, next) => {
  try {
    const token = (req.body && req.body.token) || req.query.token;
    if (!token) return res.status(400).json({ error: 'token is required' });

    const user = await User.findOne({ verificationToken: String(token) });
    if (!user) {
      return res.status(400).json({ error: 'This verification link is invalid or was already used' });
    }

    user.isVerified = true;
    user.verificationToken = null;
    await user.save();

    res.status(200).json({ message: 'Email verified. You can log in now.' });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/resend-verification   takes: { email }
//   returns: 200 { message }  (always, see GENERIC_EMAIL_REPLY above)
//   db:      User.findOne({ email }), then save a new verificationToken
exports.resendVerification = async (req, res, next) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: 'email is required' });

    const user = await User.findOne({ email: String(email).trim().toLowerCase() });
    if (user && !user.isVerified) {
      const token = newToken();
      user.verificationToken = token;
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
//   db:      User.findOne({ email }), then save a HASHED resetPasswordToken + expiry time
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: 'email is required' });

    const user = await User.findOne({ email: String(email).trim().toLowerCase() });
    if (user) {
      const token = newToken();
      user.resetPasswordToken = hashToken(token);
      user.resetPasswordExpires = new Date(Date.now() + RESET_TOKEN_TTL_MS);
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
//   db:      User.findOne({ resetPasswordToken: hash(token), resetPasswordExpires > now }),
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
      resetPasswordToken: hashToken(token),
      resetPasswordExpires: { $gt: new Date() }
    });
    if (!user) {
      return res.status(400).json({ error: 'This reset link is invalid or has expired' });
    }

    user.password = String(password); // the User model hashes this on save
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    res.status(200).json({ message: 'Password updated. You can log in with your new password.' });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/register
//   takes:   { teacher: { firstName, lastName, email, login, password }, student: { ... }, behaviorsList: [...] }
//   returns: 201 { token, user }
exports.register = async (req, res, next) => {
  try {
    const { teacher, student, behaviorsList } = req.body || {};

    const username = teacher?.login || teacher?.Login || teacher?.username || teacher?.Username;
    const password = teacher?.password || teacher?.Password;
    const email = teacher?.email || teacher?.Email;

    if (!teacher || !username || !password || !email) {
      return res.status(400).json({ error: 'Validation Failed: Missing required teacher registration details.' });
    }

    // 2. Prevent duplication conflicts
    const normalizedUsername = String(username).trim().toLowerCase();
    const existingUser = await User.findOne({ login: normalizedUsername });
    if (existingUser) {
      return res.status(400).json({ error: 'Username is already taken' });
    }

    // 3. Save the main Teacher profile
    const newUser = new User({
      firstName: teacher.firstName || teacher.FirstName,
      lastName: teacher.lastName || teacher.LastName,
      email: String(email).trim().toLowerCase(),
      login: normalizedUsername,
      password: String(password), 
      isVerified: true 
    });
    await newUser.save();


    //     // 4. SAVE THE STUDENT (Implicitly linked to the teacher via userId)
    // if (student && (student.firstName || student.FirstName || student.studentFirstName)) {
    //   const newStudent = new Student({
    //     firstName: student.firstName || student.FirstName || student.studentFirstName,
    //     lastName: student.lastName || student.LastName || student.studentLastName,
    //     gradeLevel: student.gradeLevel || student.GradeLevel,
    //     notes: student.notes || student.Notes,
    //     userId: newUser._id // Links the student record directly to this teacher's account ID
    //   });
    //   await newStudent.save();
    // }

    // // 5. BATCH SAVE THE TRACKING MATRIX BEHAVIORS
    // if (behaviorsList && behaviorsList.length > 0) {
    //   const behaviorDocs = behaviorsList.map(b => ({
    //     name: b.name || b.Name,
    //     code: b.code || b.Code,
    //     description: b.description || b.Description,
    //     color: b.color || b.Color || '#E4572E',
    //     userId: newUser._id // Links the behavior metric definition directly to this teacher's account ID
    //   }));
    //   await Behavior.insertMany(behaviorDocs);
    // }

    // newUser.password = undefined;

    res.status(201).json({ 
      token: createToken(newUser), 
      user: newUser 
    });
  } catch (err) {
    next(err);
  }
};
