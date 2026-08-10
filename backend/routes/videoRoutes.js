const express = require('express');
const router = express.Router();
const {
  getCourseVideos,
  getVideo,
  useVideoLink,
  createVideo,
  updateVideo,
  deleteVideo,
  searchVideos,
  askQuestion,
  getVideoQuestions,
  answerQuestion,
  upvoteQuestion,
  markBestAnswer,
  getUploadCredentialsForVideo,
  uploadVideoProxy,
  checkVideoStatus,
  linkToStream,
  getTopVideos,
} = require('../controllers/videoController');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { checkSubscriptions } = require('../middleware/subscriptionCheck');
const validateObjectId = require('../middleware/validateObjectId');

// ════════════════════════════════════════════════════════════════
// allowLongUpload — lifts the whole-request deadline for ONE route.
//
// index.js sets server.requestTimeout = 60_000 as deliberate slow-POST
// protection for an internet-facing backend. That is a whole-request
// deadline, so it also kills a legitimate multi-GB lesson upload: measured
// on Node v22.13.1 against this app's exact settings, a steady 100 MB PUT
// was destroyed with HTTP 408 at 90.0s (the 60s deadline is only enforced by
// a sweep that runs every server.connectionsCheckingInterval — 30s by
// default — so the real ceiling is 60-90s, not exactly 60s).
//
// req.setTimeout(0) / res.setTimeout(0) do NOT lift it. Those govern the
// socket idle timer (server.timeout); requestTimeout is enforced elsewhere
// entirely — _http_server.js's checkConnections() asks a C++ connections
// list which parsers have expired and destroys their sockets. Measured: with
// req+res+socket setTimeout(0) applied, the same upload still died at 90.0s.
// They are set below anyway, because the socket idle timer is a second,
// independent way for a long transfer to be cut.
//
// The one JS-reachable lever is checkConnections' own guard:
//     const socket = expired[i].socket; if (socket) onRequestTimeout(socket);
// `expired[i]` is the parser, and `parser.socket` is a plain JS property. A
// parser with no socket is skipped, so the connection is never reaped for
// exceeding the deadline. Measured: 100 MB over 104.6s, HTTP 200, all bytes
// received.
//
// Trade-offs, deliberately accepted:
//   * This touches an undocumented internal. It is feature-detected — if a
//     future Node stops exposing socket.parser the guard simply does nothing
//     and behaviour reverts to today's, with no crash.
//   * While detached, requestTimeout cannot reap this one connection. That is
//     why the middleware is mounted AFTER authenticate + requireAdmin: only an
//     authenticated admin can hold a connection this way. Every other route
//     keeps the full 60s protection.
//   * Client-abort handling is unaffected — an abrupt hangup surfaces as a
//     server 'clientError' identically with and without the detach (verified
//     side by side), so uploadVideoProxy's error path behaves the same.
const allowLongUpload = (req, res, next) => {
  // Socket idle timers: independent of requestTimeout, and also fatal to a
  // transfer that pauses (a slow client, a stalled disk on the mkhls side).
  req.setTimeout(0);
  res.setTimeout(0);
  if (typeof req.socket?.setTimeout === 'function') req.socket.setTimeout(0);

  const parser = req.socket?.parser;
  if (parser && 'socket' in parser) {
    const attached = parser.socket;
    parser.socket = null;
    // Restore as soon as the body is in, so the connection goes back under
    // the server's normal supervision for anything that follows on it.
    const restore = () => {
      if (parser.socket === null) parser.socket = attached;
    };
    req.once('end', restore);
    req.once('close', restore);
    res.once('close', restore);
  } else {
    console.warn(
      '[video] allowLongUpload: socket.parser is not exposed on this Node ' +
      `(${process.version}) — uploads longer than server.requestTimeout will be cut`
    );
  }
  next();
};

// ════════════════════════════════════════════════════════════════
// GET /api/videos/course/:courseId
// ════════════════════════════════════════════════════════════════
router.get('/course/:courseId', getCourseVideos);

router.get('/search', authenticate, searchVideos);
router.get('/top', getTopVideos);

// ════════════════════════════════════════════════════════════════
// GET /api/videos/:id
// ════════════════════════════════════════════════════════════════
router.get('/:id', validateObjectId(), authenticate, checkSubscriptions, getVideo);

// ════════════════════════════════════════════════════════════════
// POST /api/videos/link/:linkId/use
// ════════════════════════════════════════════════════════════════
router.post('/link/:linkId/use', authenticate, useVideoLink);

// ════════════════════════════════════════════════════════════════
// POST /api/videos  |  PUT /api/videos/:id  |  DELETE /api/videos/:id
// ════════════════════════════════════════════════════════════════
router.post('/', authenticate, requireAdmin, createVideo);

router.put('/:id', validateObjectId(), authenticate, requireAdmin, updateVideo);
router.delete('/:id', validateObjectId(), authenticate, requireAdmin, deleteVideo);

// ════════════════════════════════════════════════════════════════
// Bunny.net endpoints (Admin only)
// ════════════════════════════════════════════════════════════════

router.get('/:id/upload-credentials', validateObjectId(), authenticate, requireAdmin, getUploadCredentialsForVideo);

// Video binary'ni backend orqali mkhls'ga oqizadi (octet-stream raw body — body-parser tegmaydi).
// allowLongUpload sits after requireAdmin on purpose — see its definition above.
router.put('/:id/upload-proxy', validateObjectId(), authenticate, requireAdmin, allowLongUpload, uploadVideoProxy);

router.get('/:id/status', validateObjectId(), authenticate, requireAdmin, checkVideoStatus);

router.patch('/:id/link-stream', validateObjectId(), authenticate, requireAdmin, linkToStream);

router.get('/:id/questions', validateObjectId(), getVideoQuestions);
router.post('/:id/questions', validateObjectId(), authenticate, askQuestion);

router.post('/:id/questions/:questionId/answer', validateObjectId('questionId'), authenticate, requireAdmin, answerQuestion);
router.post('/:id/questions/:questionId/upvote', validateObjectId('questionId'), authenticate, upvoteQuestion);
router.post('/:id/questions/:questionId/best', validateObjectId('questionId'), authenticate, requireAdmin, markBestAnswer);

module.exports = router;
