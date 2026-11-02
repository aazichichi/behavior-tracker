const { Behavior, BehaviorEvent } = require('../models');
const { pick, isTrue } = require('../utils/body');

const FIELDS = {
  name: 'Name',
  code: 'Code',
  description: 'Description',
  color: 'Color',
  isArchived: 'IsArchived'
};

const normalizeCode = (code) => String(code).trim().toUpperCase();

// each letter can only be used by ONE active (not archived) behavior per student.
// the db enforces this too (uniq_code_per_student index), but checking here first
// gives a way nicer error message than the raw index error
const codeInUse = (studentId, code, exceptId) =>
  Behavior.exists({
    StudentId: studentId,
    Code: code,
    IsArchived: false,
    ...(exceptId ? { _id: { $ne: exceptId } } : {})
  });

// GET /api/students/:studentId/behaviors?includeArchived=true
//   returns: 200 [behavior, ...] sorted by Code
//   db:      Behaviors.find({ StudentId, UserId, [IsArchived: false] })
exports.listBehaviors = async (req, res, next) => {
  try {
    const filter = { StudentId: req.student._id, UserId: req.userId };
    if (!isTrue(req.query.includeArchived)) filter.IsArchived = false;

    const behaviors = await Behavior.find(filter).sort({ Code: 1 });
    res.status(200).json(behaviors);
  } catch (err) {
    next(err);
  }
};

// POST /api/students/:studentId/behaviors
//   takes:   { name, code, description?, color? }   code = one letter, like "V"
//   returns: 201 behavior  |  400 { error }  |  409 that letter's already used for this student
//   db:      Behaviors.exists (the code check), Behaviors.insertOne
exports.createBehavior = async (req, res, next) => {
  try {
    const fields = pick(req.body, FIELDS);
    delete fields.IsArchived; // new behaviors always start out active

    if (!fields.Name || !fields.Code) {
      return res.status(400).json({ error: 'name and code are required' });
    }

    fields.Code = normalizeCode(fields.Code);
    if (await codeInUse(req.student._id, fields.Code)) {
      return res.status(409).json({ error: `Code ${fields.Code} is already used by another behavior for this student` });
    }

    const behavior = await Behavior.create({
      ...fields,
      StudentId: req.student._id,
      UserId: req.userId
    });
    res.status(201).location(`/api/behaviors/${behavior._id}`).json(behavior);
  } catch (err) {
    next(err);
  }
};

// GET /api/behaviors/:behaviorId
//   returns: 200 behavior  |  404 { error }
exports.getBehavior = (req, res) => {
  res.status(200).json(req.behavior);
};

// PATCH /api/behaviors/:behaviorId
//   takes:   any of { name, code, description, color, isArchived }
//   returns: 200 behavior  |  400 { error }  |  409 that letter's already used
//   db:      Behaviors.exists (the code check), Behaviors.updateOne
exports.updateBehavior = async (req, res, next) => {
  try {
    const updates = pick(req.body, FIELDS);

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: `Send at least one of: ${Object.keys(FIELDS).join(', ')}` });
    }
    if (updates.Code !== undefined) updates.Code = normalizeCode(updates.Code);

    // check the code against what the behavior will look like AFTER this update
    // (ex: un-archiving a behavior whose letter got reused in the meantime)
    const finalCode = updates.Code !== undefined ? updates.Code : req.behavior.Code;
    const finalArchived =
      updates.IsArchived !== undefined ? isTrue(updates.IsArchived) : req.behavior.IsArchived;
    if (updates.IsArchived !== undefined) updates.IsArchived = finalArchived;

    if (!finalArchived && (await codeInUse(req.behavior.StudentId, finalCode, req.behavior._id))) {
      return res.status(409).json({ error: `Code ${finalCode} is already used by another behavior for this student` });
    }

    req.behavior.set(updates);
    await req.behavior.save();
    res.status(200).json(req.behavior);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/behaviors/:behaviorId
//   if the behavior already has recorded events we archive it instead of deleting,
//   so old charts don't lose data
//   returns: 200 { message, archived: false }            actually deleted
//            200 { message, archived: true, behavior }   archived instead
//   db:      BehaviorEvents.exists, then Behaviors.deleteOne or Behaviors.updateOne
exports.deleteBehavior = async (req, res, next) => {
  try {
    const hasEvents = await BehaviorEvent.exists({ BehaviorId: req.behavior._id });

    if (!hasEvents) {
      await req.behavior.deleteOne();
      return res.status(200).json({ message: 'Behavior deleted', archived: false });
    }

    req.behavior.IsArchived = true;
    await req.behavior.save();
    res.status(200).json({
      message: 'Behavior has recorded events, so it was archived instead of deleted',
      archived: true,
      behavior: req.behavior
    });
  } catch (err) {
    next(err);
  }
};
