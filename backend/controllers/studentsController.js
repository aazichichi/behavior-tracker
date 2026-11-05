const { Student, Behavior, Session, BehaviorEvent } = require('../models');
const { pick, escapeRegex, parseDate } = require('../utils/body');
const { buildSummary } = require('../utils/chart');

// request body field name -> db field name. Map directly to camelCase.
const FIELDS = {
  firstName: 'firstName',
  lastName: 'lastName',
  gradeLevel: 'gradeLevel',
  notes: 'notes'
};

// GET /api/students?search=mia
//   returns: 200 [student, ...] sorted by last name then first name
//   db:      Student.find({ userId, [firstName or lastName matches search] })
exports.listStudents = async (req, res, next) => {
  try {
    const filter = { userId: req.userId };

    if (req.query.search) {
      const pattern = new RegExp(escapeRegex(req.query.search), 'i');
      filter.$or = [{ firstName: pattern }, { lastName: pattern }];
    }

    const students = await Student.find(filter).sort({ lastName: 1, firstName: 1 });
    res.status(200).json(students);
  } catch (err) {
    next(err);
  }
};

// POST /api/students
//   takes:   { firstName, lastName, gradeLevel?, notes? }
//   returns: 201 student  |  400 { error }
//   db:      Student.create
exports.createStudent = async (req, res, next) => {
  try {
    const fields = pick(req.body, FIELDS);

    if (!fields.firstName || !fields.lastName) {
      return res.status(400).json({ error: 'firstName and lastName are required' });
    }

    const student = await Student.create({ ...fields, userId: req.userId });
    res.status(201).location(`/api/students/${student._id}`).json(student);
  } catch (err) {
    next(err);
  }
};

// GET /api/students/:studentId
//   returns: 200 student  |  404 { error }
//   db:      Student.findOne({ _id, userId })  (loadOwned already did this for us)
exports.getStudent = (req, res) => {
  res.status(200).json(req.student);
};

// PATCH /api/students/:studentId
//   takes:   any of { firstName, lastName, gradeLevel, notes }
//   returns: 200 student  |  400 { error }
//   db:      Student.updateOne
exports.updateStudent = async (req, res, next) => {
  try {
    const updates = pick(req.body, FIELDS);

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: `Send at least one of: ${Object.keys(FIELDS).join(', ')}` });
    }

    req.student.set(updates);
    await req.student.save();
    res.status(200).json(req.student);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/students/:studentId
//   returns: 200 { message, deleted: { behaviors, sessions, events } }
//   db:      deleteMany on BehaviorEvent, Session, Behavior, then Student.deleteOne
//   (deletes everything under the student too so we don't leave orphaned data)
exports.deleteStudent = async (req, res, next) => {
  try {
    const filter = { studentId: req.student._id, userId: req.userId };

    const events = await BehaviorEvent.deleteMany(filter);
    const sessions = await Session.deleteMany(filter);
    const behaviors = await Behavior.deleteMany(filter);
    await req.student.deleteOne();

    res.status(200).json({
      message: 'Student deleted',
      deleted: {
        behaviors: behaviors.deletedCount,
        sessions: sessions.deletedCount,
        events: events.deletedCount
      }
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/students/:studentId/summary?from=2026-10-01&to=2026-10-31
//   returns: 200 { student, sessions: [...], behaviors: [...] }
//            for each session: minutes, count + rate per hour for each behavior,
//            so the front end can graph progress over time
//   db:      Session.find (startTime in range), BehaviorEvent.find (for those sessions),
//            Behavior.find (all of them, archived ones too)
exports.getSummary = async (req, res, next) => {
  try {
    const from = parseDate(req.query.from, 'from');
    const to = parseDate(req.query.to, 'to');

    const sessionFilter = { studentId: req.student._id, userId: req.userId };
    if (from || to) {
      sessionFilter.startTime = {};
      if (from) sessionFilter.startTime.$gte = from;
      if (to) sessionFilter.startTime.$lte = to;
    }

    const sessions = await Session.find(sessionFilter).sort({ startTime: 1 }).lean();
    const events = await BehaviorEvent.find({
      sessionId: { $in: sessions.map((s) => s._id) },
      userId: req.userId
    }).lean();
    const behaviors = await Behavior.find({ studentId: req.student._id, userId: req.userId })
      .sort({ code: 1 })
      .lean();

    res.status(200).json({ student: req.student, ...buildSummary(sessions, events, behaviors) });
  } catch (err) {
    next(err);
  }
};
