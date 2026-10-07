// Socket.io handshake autentifikatsiyasi.
// Identity FAQAT tekshirilgan tokendan olinadi — client payload'idagi user/id'ga ishonilmaydi.
//
// Ikki manba:
//   1. socket.handshake.auth.token — qisqa muddatli "socket token" (audience aidevix-socket).
//      Frontend uni GET /api/socket-token orqali (Vercel proxy, httpOnly cookie bilan) oladi,
//      chunki WS to'g'ridan-to'g'ri backend domeniga ulanadi va first-party cookie bormaydi.
//   2. Access cookie (aidevix_access) — frontend va backend bir sayt ostida bo'lsa.
const jwt = require('jsonwebtoken');
const { ACCESS_TOKEN_SECRET } = require('../config/jwt');
const { verifyAccessToken } = require('../utils/jwt');
const { ACCESS_COOKIE_NAME, parseCookies } = require('../utils/authSecurity');
const User = require('../models/User');

const SOCKET_TOKEN_OPTS = { algorithm: 'HS256', issuer: 'aidevix', audience: 'aidevix-socket' };
const SOCKET_VERIFY_OPTS = { algorithms: ['HS256'], issuer: 'aidevix', audience: 'aidevix-socket' };
const SOCKET_TOKEN_TTL = '2m'; // faqat handshake uchun; reconnect'da client yangisini oladi

const issueSocketToken = (user) =>
  jwt.sign(
    { userId: String(user._id), tv: user.tokenVersion || 0 },
    ACCESS_TOKEN_SECRET,
    { ...SOCKET_TOKEN_OPTS, expiresIn: SOCKET_TOKEN_TTL }
  );

const verifySocketToken = (token) => {
  try {
    return jwt.verify(token, ACCESS_TOKEN_SECRET, SOCKET_VERIFY_OPTS);
  } catch (_) {
    return null;
  }
};

// Handshake'dan foydalanuvchini aniqlaydi. Topilmasa yoki yaroqsiz bo'lsa — null.
const resolveSocketUser = async (socket) => {
  const handshake = socket.handshake || {};
  const authToken = handshake.auth && typeof handshake.auth.token === 'string' ? handshake.auth.token : null;
  let decoded = null;
  if (authToken && authToken.length < 4096) decoded = verifySocketToken(authToken);
  if (!decoded) {
    const cookieHeader = handshake.headers && typeof handshake.headers.cookie === 'string' ? handshake.headers.cookie : '';
    const cookieToken = parseCookies(cookieHeader)[ACCESS_COOKIE_NAME];
    if (cookieToken) decoded = verifyAccessToken(cookieToken);
  }
  if (!decoded || typeof decoded.userId !== 'string') return null;

  const user = await User.findById(decoded.userId)
    .select('username firstName lastName email role isActive avatar tokenVersion deletedAt')
    .lean();
  if (!user || !user.isActive || user.deletedAt) return null;
  const tokenTv = typeof decoded.tv === 'number' ? decoded.tv : 0;
  if (tokenTv !== (user.tokenVersion || 0)) return null;

  const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username;
  return {
    id: String(user._id),
    username: user.username,
    name,
    email: user.email,
    role: user.role,
    avatar: user.avatar || null,
  };
};

// io.use / namespace.use middleware. required=true → token'siz ulanish rad etiladi.
const socketAuth = ({ required }) => (socket, next) => {
  resolveSocketUser(socket)
    .then((user) => {
      if (!user && required) return next(new Error('unauthorized'));
      socket.data.user = user || null;
      return next();
    })
    .catch(() => {
      if (required) return next(new Error('unauthorized'));
      socket.data.user = null;
      return next();
    });
};

module.exports = { issueSocketToken, verifySocketToken, resolveSocketUser, socketAuth };
