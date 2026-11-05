// schema options that every model shares.
//
// the collections, their $jsonSchema validators, and all the indexes get made by
// the db seed script (database/seed.mongodb.js), so we tell mongoose NOT to try
// creating any of that itself
exports.baseOptions = (collection) => ({
  collection,
  versionKey: false,
  autoCreate: false,
  autoIndex: false
});

// for collections that keep track of when a doc was created / last changed.
// mongoose fills these two in automatically on create and save
exports.withTimestamps = (collection) => ({
  ...exports.baseOptions(collection),
  timestamps: { createdAt: 'dateCreated', updatedAt: 'dateUpdated' }
});
