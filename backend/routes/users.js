const express = require('express');
const users = require('../controllers/usersController');
const validateObjectId = require('../middleware/validateObjectId');
const { requireAuth, requireSelf } = require('../middleware/auth');

const router = express.Router();

// checks that :userId is a real mongo id before any route below runs
router.param('userId', validateObjectId);

// POST /api/users - register a new teacher or parent (anyone can do this)
router.post('/', users.createUser);

// everything below needs you logged in, and only works on YOUR account
// GET /api/users/:userId - get your account
router.get('/:userId', requireAuth, requireSelf, users.getUser);
// PATCH /api/users/:userId - change your name, email, or password
router.patch('/:userId', requireAuth, requireSelf, users.updateUser);

module.exports = router;
