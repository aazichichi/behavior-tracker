// request bodies come in camelCase (firstName) but the db uses PascalCase (FirstName).
// pick() copies over only the fields we allow AND that were actually sent, renaming
// them as it goes. this also means a client can't sneak in fields like UserId.
//
//   pick({ firstName: 'Mia', UserId: 'x' }, { firstName: 'FirstName' })
//   -> { FirstName: 'Mia' }
exports.pick = (body, fieldMap) => {
  const out = {};
  if (!body || typeof body !== 'object') return out;

  for (const [from, to] of Object.entries(fieldMap)) {
    if (body[from] !== undefined) out[to] = body[from];
  }
  return out;
};

// turns a query string value like ?includeArchived=true into an actual true/false
exports.isTrue = (value) => value === true || value === 'true' || value === '1';

// turns a ?from= / ?to= value into a Date, or null if it wasn't sent at all.
// if it's not a real date it throws an error with status 400 (errorHandler sends it back)
exports.parseDate = (value, name) => {
  if (value === undefined || value === null || value === '') return null;
  // accepts either milliseconds since 1970 (what Date.now() gives you) or an ISO date string
  const isNumber = typeof value === 'number' || /^\d+$/.test(String(value));
  const date = new Date(isNumber ? Number(value) : String(value));
  if (Number.isNaN(date.getTime())) {
    const err = new Error(`${name} must be a date, for example 2026-10-01`);
    err.status = 400;
    throw err;
  }
  return date;
};

// escapes special characters in user text before we put it in a regex (for the search box),
// otherwise searching something like "a.b" would match "axb"
exports.escapeRegex = (text) => String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
