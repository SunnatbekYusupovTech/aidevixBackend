const express = require('express');
const router  = express.Router();
const { followUser, unfollowUser, getFollowStats, getMyFollowers, getMyFollowing } = require('../controllers/followController');
const { authenticate } = require('../middleware/auth');
const validateObjectId = require('../middleware/validateObjectId');

router.post('/:userId',   authenticate, validateObjectId('userId'), followUser);
router.delete('/:userId', authenticate, validateObjectId('userId'), unfollowUser);
router.get('/:userId/stats', validateObjectId('userId'), getFollowStats);
router.get('/my/followers', authenticate, getMyFollowers);
router.get('/my/following', authenticate, getMyFollowing);

module.exports = router;
