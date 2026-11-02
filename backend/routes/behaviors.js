const express = require('express');
const behaviors = require('../controllers/behaviorsController');
const { requireAuth } = require('../middleware/auth');
const loadOwned = require('../middleware/loadOwned');
const { Behavior } = require('../models');

const router = express.Router();

router.use(requireAuth);
router.param('behaviorId', loadOwned(Behavior, 'behavior'));

// /api/behaviors/:behaviorId
// (creating + listing behaviors is under /api/students/:studentId/behaviors instead)
router.get('/:behaviorId', behaviors.getBehavior);
router.patch('/:behaviorId', behaviors.updateBehavior);
router.delete('/:behaviorId', behaviors.deleteBehavior);

module.exports = router;
