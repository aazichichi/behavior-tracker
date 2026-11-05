const { Behavior, BehaviorEvent } = require('../models');
const { pick, isTrue } = require('../utils/body');

const FIELDS = {
  name: 'name',
  code: 'code',
  description: 'description',
  color: 'color',
  isArchived: 'isArchived'
};

const normalizeCode = (code) => String(code).trim().toUpperCase();

// each letter can only be used by ONE active (not archived) behavior per student.
// the db enforces this too (uniq_code_per_student index), but checking here first
// gives a way nicer error message than the raw index error
const codeInUse = (studentId, code, exceptId) =>
  Behavior.exists({
    studentId: studentId,
    code: code,
    isArchived: false,
    ...(exceptId ? { _id: { $ne: exceptId } } : {})
  });

// GET /api/students/:studentId/behaviors?includeArchived=true
//   returns: 200 [behavior, ...] sorted by code
//   db:      Behavior.find({ studentId, userId, [isArchived: false] })
exports.listBehaviors = async (req, res, next) => {
  try {
    const filter = { studentId: req.student._id, userId: req.userId };
    if (!isTrue(req.query.includeArchived)) filter.isArchived = false;

    const behaviors = await Behavior.find(filter).sort({ code: 1 });
    res.status(200).json(behaviors);
  } catch (err) {
    next(err);
  }
};

// POST /api/students/:studentId/behaviors
//   takes:   { name, code, description?, color? }   code = one letter, like "V"
//   returns: 201 behavior  |  400 { error }  |  409 that letter's already used for this student
//   db:      Behavior.exists (the code check), Behavior.create
exports.createBehavior = async (req, res, next) => {
  try {
    const fields = pick(req.body, FIELDS);
    delete fields.isArchived; // new behaviors always start out active

    if (!fields.name || !fields.code) {
      return res.status(400).json({ error: 'name and code are required' });
    }

    fields.code = normalizeCode(fields.code);
    if (await codeInUse(req.student._id, fields.code)) {
      return res.status(409).json({ error: `Code ${fields.code} is already used by another behavior for this student` });
    }

    const behavior = await Behavior.create({
      ...fields,
      studentId: req.student._id,
      userId: req.userId
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
//   db:      Behavior.exists (the code check), Behavior.updateOne
exports.updateBehavior = async (req, res, next) => {
  try {
    const updates = pick(req.body, FIELDS);

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: `Send at least one of: ${Object.keys(FIELDS).join(', ')}` });
    }
    if (updates.code !== undefined) updates.code = normalizeCode(updates.code);

    // check the code against what the behavior will look like AFTER this update
    // (ex: un-archiving a behavior whose letter got reused in the meantime)
    const finalCode = updates.code !== undefined ? updates.code : req.behavior.code;
    const finalArchived =
      updates.isArchived !== undefined ? isTrue(updates.isArchived) : req.behavior.isArchived;
    if (updates.isArchived !== undefined) updates.isArchived = finalArchived;

    if (!finalArchived && (await codeInUse(req.behavior.studentId, finalCode, req.behavior._id))) {
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
//   db:      BehaviorEvent.exists, then Behavior.deleteOne or Behavior.updateOne
exports.deleteBehavior = async (req, res, next) => {
  try {
    const hasEvents = await BehaviorEvent.exists({ behaviorId: req.behavior._id });

    if (!hasEvents) {
      await req.behavior.deleteOne();
      return res.status(200).json({ message: 'Behavior deleted', archived: false });
    }

    req.behavior.isArchived = true;
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
