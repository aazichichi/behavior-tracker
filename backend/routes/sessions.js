const express = require('express');
const sessions = require('../controllers/sessionsController');
const events = require('../controllers/eventsController');
const { requireAuth } = require('../middleware/auth');
const loadOwned = require('../middleware/loadOwned');
const { Session } = require('../models');

const router = express.Router();

router.use(requireAuth);
// saved as req.sessionDoc instead of req.session, since a lot of express
// packages already use req.session for their own thing
router.param('sessionId', loadOwned(Session, 'sessionDoc'));

// /api/sessions/:sessionId
// (starting + listing sessions is under /api/students/:studentId/sessions instead)
router.get('/:sessionId', sessions.getSession);
router.patch('/:sessionId', sessions.updateSession);
router.delete('/:sessionId', sessions.deleteSession);

// /api/sessions/:sessionId/chart - data for the interval chart
router.get('/:sessionId/chart', sessions.getChart);

// /api/sessions/:sessionId/events - record + list behavior taps
router.get('/:sessionId/events', events.listEvents);
router.post('/:sessionId/events', events.createEvent);

module.exports = router;
