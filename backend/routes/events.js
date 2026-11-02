const express = require('express');
const events = require('../controllers/eventsController');
const { requireAuth } = require('../middleware/auth');
const loadOwned = require('../middleware/loadOwned');
const { BehaviorEvent } = require('../models');

const router = express.Router();

router.use(requireAuth);
router.param('eventId', loadOwned(BehaviorEvent, 'event'));

// /api/events/:eventId
// (recording + listing events is under /api/sessions/:sessionId/events instead)
router.get('/:eventId', events.getEvent);
router.delete('/:eventId', events.deleteEvent);

module.exports = router;
