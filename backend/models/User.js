const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// how many rounds bcrypt does per hash. each +1 doubles the time, which is the
// whole point (makes brute forcing a leaked hash slow). 10 matches the seed data
const SALT_ROUNDS = 10;

// field names match the Users collection from seed.mongodb.js EXACTLY (PascalCase).
// that collection has a strict $jsonSchema validator, so every required field has
// to be there or mongo rejects the insert. the defaults below handle that
const userSchema = new mongoose.Schema(
  {
    FirstName: { type: String, required: [true, 'First name is required'], trim: true },
    LastName: { type: String, required: [true, 'Last name is required'], trim: true },
    Email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      match: [/^.+@.+\..+$/, 'Email address is not valid']
    },
    Login: {
      type: String,
      required: [true, 'Login username is required'],
      trim: true,
      lowercase: true
    },
    Password: {
      type: String,
      required: [true, 'Password is required'],
      // hidden from queries by default. you only get the hash back if you
      // specifically ask with .select('+Password') (login does this)
      select: false
    },
    Role: {
      type: String,
      enum: { values: ['teacher', 'parent'], message: 'Role must be teacher or parent' },
      default: 'teacher'
    },
    IsVerified: { type: Boolean, default: false },
    VerificationToken: { type: String, default: null, select: false },
    ResetPasswordToken: { type: String, default: null, select: false },
    ResetPasswordExpires: { type: Date, default: null, select: false }
  },
  {
    collection: 'Users',
    versionKey: false,
    // mongoose fills DateCreated / DateUpdated in for us automatically
    timestamps: { createdAt: 'DateCreated', updatedAt: 'DateUpdated' },
    // the seed script already made the collection + unique indexes
    // (uniq_login, uniq_email), so mongoose shouldn't try to make them again
    autoCreate: false,
    autoIndex: false
  }
);

// runs right before every save: if the password changed, hash it first.
// this way a plain text password never actually gets written to the db
userSchema.pre('save', async function () {
  if (!this.isModified('Password')) return;
  this.Password = await bcrypt.hash(this.Password, SALT_ROUNDS);
});

// checks a login attempt against the stored hash (true/false).
// only works if the user was loaded with .select('+Password')
userSchema.methods.checkPassword = function (candidate) {
  return bcrypt.compare(candidate, this.Password);
};

// whenever a user gets sent back as JSON, strip out the hash + tokens
// so we never accidentally leak them in a response
userSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.Password;
    delete ret.VerificationToken;
    delete ret.ResetPasswordToken;
    delete ret.ResetPasswordExpires;
    return ret;
  }
});

module.exports = mongoose.model('User', userSchema);
