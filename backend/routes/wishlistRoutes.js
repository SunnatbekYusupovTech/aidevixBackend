const express = require('express');
const router  = express.Router();
const { addToWishlist, removeFromWishlist, getWishlist } = require('../controllers/wishlistController');
const { authenticate } = require('../middleware/auth');
const validateObjectId = require('../middleware/validateObjectId');

router.get('/', authenticate, getWishlist);
router.post('/:courseId',   authenticate, validateObjectId('courseId'), addToWishlist);
router.delete('/:courseId', authenticate, validateObjectId('courseId'), removeFromWishlist);

module.exports = router;
