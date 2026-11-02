// catch-all 404 for any url that didn't match a route
exports.notFound = (req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
};

// one central error handler for the whole API. controllers just call next(err)
// and this picks the status code, so every error response has the same
// { error: "..." } shape.
// note: express only treats this as an error handler because it has 4 params,
// so `next` has to stay even though we never use it
// eslint-disable-next-line no-unused-vars
exports.errorHandler = (err, req, res, next) => {
  // someone sent a body that isn't valid JSON
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Request body is not valid JSON' });
  }

  // errors we throw ourselves with a status attached (like a bad ?from= date)
  if (err.status && err.status >= 400 && err.status < 500) {
    return res.status(err.status).json({ error: err.message });
  }

  // mongoose didn't like the data (missing field, wrong type, bad id, etc.)
  if (err.name === 'ValidationError' || err.name === 'CastError') {
    return res.status(400).json({ error: err.message });
  }

  // mongo's own $jsonSchema validator (from the seed script) rejected the doc
  if (err.code === 121) {
    return res.status(400).json({ error: 'Document failed database validation' });
  }

  // duplicate key on a unique index (ex: two people registering the same login at once)
  if (err.code === 11000) {
    return res.status(409).json({ error: 'Resource already exists' });
  }

  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
};
