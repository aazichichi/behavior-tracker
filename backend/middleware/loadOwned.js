const mongoose = require('mongoose');

// used with router.param() for :studentId, :behaviorId, :sessionId and :eventId.
// it loads the doc ONLY if it belongs to whoever's logged in, then sticks it on
// req (req.student, req.sessionDoc, etc.) so the controllers don't each have to
// redo the "is this yours?" check.
//
// if it's someone else's we send the same 404 as if it didn't exist, so people
// can't go guessing ids. requireAuth has to run before this (router.use(requireAuth))
module.exports = (Model, reqKey) => async (req, res, next, id, name) => {
  try {
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: `Invalid ${name}: ${id}` });
    }

    const doc = await Model.findOne({ _id: id, UserId: req.userId });
    if (!doc) {
      return res.status(404).json({ error: `${Model.modelName} not found` });
    }

    req[reqKey] = doc;
    next();
  } catch (err) {
    next(err);
  }
};
