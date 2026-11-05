const express = require('express');
const router = express.Router();
const Session = require('../models/Session');

// GET all tracking sessions
router.get('/', async (req, res) => {
  try {
    const sessions = await Session.find().populate('studentId').populate('intervals.behaviorsLogged');
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch sessions data.' });
  }
});

// POST a new behavior tracking session / interval update
router.post('/start', async (req, res) => {
  try {
    const newSession = new Session({
      studentId: req.body.studentId,
      intervals: []
    });
    const savedSession = await newSession.save();
    res.status(201).json(savedSession);
  } catch (err) {
    res.status(400).json({ error: 'Failed to create tracking session.' });
  }
});

module.exports = router;
