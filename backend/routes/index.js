const express = require('express');

const router = express.Router();

// GET /api/ping - health check, just to see if the API is up
router.get('/ping', (req, res) => {
  res.status(200).json({ message: 'Hello World' });
});

// public stuff (login, register, email links). the rest needs a login token
router.use('/auth', require('./auth'));
router.use('/users', require('./users'));

// the actual behavior tracking. all of these need a token and you only
// ever see your own data
router.use('/students', require('./students'));
router.use('/behaviors', require('./behaviors'));
router.use('/sessions', require('./sessions'));
router.use('/events', require('./events'));

module.exports = router;
