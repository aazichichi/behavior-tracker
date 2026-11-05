const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// how many rounds bcrypt does per hash. each +1 doubles the time, which is the
// whole point (makes brute forcing a leaked hash slow). 10 matches the seed data
const SALT_ROUNDS = 10;

// field names match the users collection from seed.mongodb.js EXACTLY (camelCase).
// that collection has a strict $jsonSchema validator, so every required field has
// to be there or mongo rejects the insert. the defaults below handle that
const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: [true, 'First name is required'], trim: true },
    lastName: { type: String, required: [true, 'Last name is required'], trim: true },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      match: [/^.+@.+\..+$/, 'Email address is not valid']
    },
    login: {
      type: String,
      required: [true, 'Login username is required'],
      trim: true,
      lowercase: true
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      // hidden from queries by default. you only get the hash back if you
      // specifically ask with .select('+password') (login does this)
      select: false
    },
    role: {
      type: String,
      enum: { values: ['teacher', 'parent'], message: 'Role must be teacher or parent' },
      default: 'teacher'
    },
    isVerified: { type: Boolean, default: false },
    verificationToken: { type: String, default: null, select: false },
    resetPasswordToken: { type: String, default: null, select: false },
    resetPasswordExpires: { type: Date, default: null, select: false }
  },
  {
    collection: 'users',
    versionKey: false,
    // mongoose fills dateCreated / dateUpdated in for us automatically
    timestamps: { createdAt: 'dateCreated', updatedAt: 'dateUpdated' },
    // the seed script already made the collection + unique indexes
    // (uniq_login, uniq_email), so mongoose shouldn't try to make them again
    autoCreate: false,
    autoIndex: false
  }
);

// runs right before every save: if the password changed, hash it first.
// this way a plain text password never actually gets written to the db
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
});

// checks a login attempt against the stored hash (true/false).
// only works if the user was loaded with .select('+password')
userSchema.methods.checkPassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

// whenever a user gets sent back as JSON, strip out the hash + tokens
// so we never accidentally leak them in a response
userSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.password;
    delete ret.verificationToken;
    delete ret.resetPasswordToken;
    delete ret.resetPasswordExpires;
    return ret;
  }
});

module.exports = mongoose.model('User', userSchema);
