const express = require('express');
const students = require('../controllers/studentsController');
const behaviors = require('../controllers/behaviorsController');
const sessions = require('../controllers/sessionsController');
const { requireAuth } = require('../middleware/auth');
const loadOwned = require('../middleware/loadOwned');
const { Student } = require('../models');

const router = express.Router();

// every route in here needs a token. this HAS to come before router.param so
// req.userId already exists when the student gets loaded
router.use(requireAuth);

// any route with :studentId loads that student into req.student (only if it's yours)
router.param('studentId', loadOwned(Student, 'student'));

// /api/students
router.get('/', students.listStudents);
router.post('/', students.createStudent);

// /api/students/:studentId
router.get('/:studentId', students.getStudent);
router.patch('/:studentId', students.updateStudent);
router.delete('/:studentId', students.deleteStudent);

// /api/students/:studentId/summary - progress over multiple sessions
router.get('/:studentId/summary', students.getSummary);

// /api/students/:studentId/behaviors
router.get('/:studentId/behaviors', behaviors.listBehaviors);
router.post('/:studentId/behaviors', behaviors.createBehavior);

// /api/students/:studentId/sessions
router.get('/:studentId/sessions', sessions.listSessions);
router.post('/:studentId/sessions', sessions.startSession);

module.exports = router;
