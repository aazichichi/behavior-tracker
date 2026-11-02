const { Student, Behavior, Session, BehaviorEvent } = require('../models');
const { pick, escapeRegex, parseDate } = require('../utils/body');
const { buildSummary } = require('../utils/chart');

// request body field name -> db field name. anything else in the body gets ignored
const FIELDS = {
  firstName: 'FirstName',
  lastName: 'LastName',
  gradeLevel: 'GradeLevel',
  notes: 'Notes'
};

// GET /api/students?search=mia
//   returns: 200 [student, ...] sorted by last name then first name
//   db:      Students.find({ UserId, [FirstName or LastName matches search] })
exports.listStudents = async (req, res, next) => {
  try {
    const filter = { UserId: req.userId };

    if (req.query.search) {
      const pattern = new RegExp(escapeRegex(req.query.search), 'i');
      filter.$or = [{ FirstName: pattern }, { LastName: pattern }];
    }

    const students = await Student.find(filter).sort({ LastName: 1, FirstName: 1 });
    res.status(200).json(students);
  } catch (err) {
    next(err);
  }
};

// POST /api/students
//   takes:   { firstName, lastName, gradeLevel?, notes? }
//   returns: 201 student  |  400 { error }
//   db:      Students.insertOne
exports.createStudent = async (req, res, next) => {
  try {
    const fields = pick(req.body, FIELDS);

    if (!fields.FirstName || !fields.LastName) {
      return res.status(400).json({ error: 'firstName and lastName are required' });
    }

    const student = await Student.create({ ...fields, UserId: req.userId });
    res.status(201).location(`/api/students/${student._id}`).json(student);
  } catch (err) {
    next(err);
  }
};

// GET /api/students/:studentId
//   returns: 200 student  |  404 { error }
//   db:      Students.findOne({ _id, UserId })  (loadOwned already did this for us)
exports.getStudent = (req, res) => {
  res.status(200).json(req.student);
};

// PATCH /api/students/:studentId
//   takes:   any of { firstName, lastName, gradeLevel, notes }
//   returns: 200 student  |  400 { error }
//   db:      Students.updateOne
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
//   db:      deleteMany on BehaviorEvents, Sessions, Behaviors, then Students.deleteOne
//   (deletes everything under the student too so we don't leave orphaned data)
exports.deleteStudent = async (req, res, next) => {
  try {
    const filter = { StudentId: req.student._id, UserId: req.userId };

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
//   db:      Sessions.find (StartTime in range), BehaviorEvents.find (for those sessions),
//            Behaviors.find (all of them, archived ones too)
exports.getSummary = async (req, res, next) => {
  try {
    const from = parseDate(req.query.from, 'from');
    const to = parseDate(req.query.to, 'to');

    const sessionFilter = { StudentId: req.student._id, UserId: req.userId };
    if (from || to) {
      sessionFilter.StartTime = {};
      if (from) sessionFilter.StartTime.$gte = from;
      if (to) sessionFilter.StartTime.$lte = to;
    }

    const sessions = await Session.find(sessionFilter).sort({ StartTime: 1 }).lean();
    const events = await BehaviorEvent.find({
      SessionId: { $in: sessions.map((s) => s._id) },
      UserId: req.userId
    }).lean();
    const behaviors = await Behavior.find({ StudentId: req.student._id, UserId: req.userId })
      .sort({ Code: 1 })
      .lean();

    res.status(200).json({ student: req.student, ...buildSummary(sessions, events, behaviors) });
  } catch (err) {
    next(err);
  }
};
