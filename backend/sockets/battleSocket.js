const UserStats = require('../models/UserStats');
const User = require('../models/User');
const { socketAuth } = require('./socketAuth');

const challenges = [
  { id: 1, title: 'Ikkita son yig\'indisi', description: 'Berilgan a va b sonlarning yig\'indisini qaytaruvchi add(a, b) funksiyasini yozing.', language: 'javascript', initialCode: 'function add(a, b) {\n  \n}' },
  { id: 2, title: 'Massivdagi eng katta son', description: 'Sonlar massividan eng katta sonni topuvchi findMax(arr) funksiyasini yozing.', language: 'javascript', initialCode: 'function findMax(arr) {\n  \n}' },
  { id: 3, title: 'Faktorial hisoblash', description: 'Berilgan n sonining faktorialini hisoblovchi factorial(n) funksiyasini yozing.', language: 'javascript', initialCode: 'function factorial(n) {\n  \n}' },
  { id: 4, title: 'Palindrom tekshiruvi', description: 'Berilgan so\'z palindrom ekanligini (oldidan va orqasidan bir xil o\'qilishini) tekshiruvchi isPalindrome(str) funksiyasini yozing.', language: 'javascript', initialCode: 'function isPalindrome(str) {\n  \n}' },
];

// Payload chegaralari (COM-01 / P-B13)
const MAX_CODE_LENGTH = 20_000;
const MAX_ROOM_ID_LENGTH = 128;
const CODE_UPDATE_MIN_INTERVAL_MS = 150; // per-socket throttle
// XP farming himoyasi (COM-17): juda tez tugagan jang XP bermaydi, kunlik cap.
const MIN_PLAY_MS_FOR_XP = 15_000;
const MAX_BATTLE_XP_PER_DAY = 300;

let waitingQueue = [];
const activeBattles = new Map();
const socketRoom = new Map(); // socket.id -> roomId (linear scan o'rniga)
const dailyBattleXp = new Map(); // `${userId}:${YYYY-MM-DD}` -> xp

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const readRoomId = (payload) =>
  isObj(payload) && typeof payload.roomId === 'string' && payload.roomId.length <= MAX_ROOM_ID_LENGTH
    ? payload.roomId
    : null;
const readCode = (payload) =>
  isObj(payload) && typeof payload.code === 'string' && payload.code.length <= MAX_CODE_LENGTH
    ? payload.code
    : null;

// Handler ichidagi har qanday xato uncaughtException'ga yetib bormasligi uchun.
const safe = (name, fn) => (...args) => {
  try {
    const result = fn(...args);
    if (result && typeof result.catch === 'function') {
      result.catch((e) => console.error(`[battle] ${name} error:`, e?.message || e));
    }
  } catch (e) {
    console.error(`[battle] ${name} error:`, e?.message || e);
  }
};

// Kunlik XP cap bilan mukofot (identity faqat token'dan kelgan user.id)
const awardBattleXp = async (userId, amount) => {
  const day = new Date().toISOString().slice(0, 10);
  const key = `${userId}:${day}`;
  const used = dailyBattleXp.get(key) || 0;
  const grant = Math.min(amount, MAX_BATTLE_XP_PER_DAY - used);
  if (grant <= 0) return;
  dailyBattleXp.set(key, used + grant);
  if (dailyBattleXp.size > 10_000) {
    for (const k of dailyBattleXp.keys()) if (!k.endsWith(day)) dailyBattleXp.delete(k);
  }
  await UserStats.findOneAndUpdate(
    { userId },
    { $inc: { xp: grant, weeklyXp: grant } },
    { upsert: true }
  );
  await User.findByIdAndUpdate(userId, { $inc: { xp: grant } });
};

const playedLongEnough = (battle) =>
  battle.startedAt && Date.now() - battle.startedAt.getTime() >= MIN_PLAY_MS_FOR_XP;

function setupBattleSockets(io) {
  const battleIo = io.of('/battle');

  // COM-17: namespace faqat autentifikatsiyadan o'tgan userlar uchun
  battleIo.use(socketAuth({ required: true }));

  battleIo.on('connection', (socket) => {
    const me = socket.data.user; // { id, username, avatar, ... } — token'dan
    const publicUser = { id: me.id, username: me.username, avatar: me.avatar };
    let lastCodeUpdateAt = 0;

    socket.on('join_queue', safe('join_queue', () => {
      // Prevent joining multiple times (shu socket yoki shu user boshqa tabdan)
      if (waitingQueue.find(u => u.socketId === socket.id || u.user.id === me.id)) return;
      if (socketRoom.has(socket.id)) return;

      const player = { socketId: socket.id, user: publicUser, status: 'waiting' };
      waitingQueue.push(player);

      socket.emit('queue_joined', { message: 'Raqib qidirilmoqda...' });

      // Matchmaking
      if (waitingQueue.length >= 2) {
        const p1 = waitingQueue.shift();
        const p2 = waitingQueue.shift();

        const roomId = `room_${p1.user.id}_${p2.user.id}_${Date.now()}`;
        const challenge = challenges[Math.floor(Math.random() * challenges.length)];

        const battle = {
          roomId,
          challenge,
          p1: { ...p1, status: 'playing', code: challenge.initialCode, score: 0 },
          p2: { ...p2, status: 'playing', code: challenge.initialCode, score: 0 },
          status: 'countdown', // countdown, playing, finished
          startedAt: null,
        };

        activeBattles.set(roomId, battle);
        socketRoom.set(p1.socketId, roomId);
        socketRoom.set(p2.socketId, roomId);

        // Join sockets to room
        const socket1 = battleIo.sockets.get(p1.socketId);
        const socket2 = battleIo.sockets.get(p2.socketId);

        if (socket1) socket1.join(roomId);
        if (socket2) socket2.join(roomId);

        battleIo.to(roomId).emit('battle_matched', {
          roomId,
          challenge,
          p1: p1.user,
          p2: p2.user
        });

        // Start countdown
        setTimeout(() => {
          const b = activeBattles.get(roomId);
          if (b && b.status === 'countdown') {
            b.status = 'playing';
            b.startedAt = new Date();
            battleIo.to(roomId).emit('battle_started', { startTime: b.startedAt });
          }
        }, 5000);
      }
    }));

    socket.on('code_update', safe('code_update', (payload) => {
      const roomId = readRoomId(payload);
      const code = readCode(payload);
      if (!roomId || code === null) return;
      if (socketRoom.get(socket.id) !== roomId) return; // faqat ishtirokchi

      const now = Date.now();
      if (now - lastCodeUpdateAt < CODE_UPDATE_MIN_INTERVAL_MS) return;
      lastCodeUpdateAt = now;

      const battle = activeBattles.get(roomId);
      if (!battle || battle.status !== 'playing') return;

      if (battle.p1.socketId === socket.id) battle.p1.code = code;
      if (battle.p2.socketId === socket.id) battle.p2.code = code;

      // Broadcast to opponent (battle tirik qoladi — o'chirilmaydi)
      socket.to(roomId).emit('opponent_code_update', { code });
    }));

    socket.on('submit_code', safe('submit_code', async (payload) => {
      const roomId = readRoomId(payload);
      if (!roomId || socketRoom.get(socket.id) !== roomId) return;
      const battle = activeBattles.get(roomId);
      if (!battle || battle.status !== 'playing') return;

      const isP1 = battle.p1.socketId === socket.id;
      const player = isP1 ? battle.p1 : battle.p2;
      const code = readCode(payload);
      if (code !== null) player.code = code;

      // Simplistic check for demo (Normally use isolated VM or AI)
      // Hozircha birinchi submit qilgan yutadi
      battle.status = 'finished';
      const winner = player.user;
      const eligible = playedLongEnough(battle);
      endBattle(roomId);

      battleIo.to(roomId).emit('battle_ended', {
        winnerId: winner.id,
        message: `${winner.username} masalani birinchi bo'lib yechdi!`
      });

      // Award XP to winner
      if (eligible) {
        try {
          await awardBattleXp(winner.id, 30);
        } catch (e) {
          console.error('Battle XP award error:', e?.message || e);
        }
      }
    }));

    socket.on('leave_battle', safe('leave_battle', (payload) => {
      handleDisconnectOrLeave(socket, readRoomId(payload));
    }));

    socket.on('disconnect', safe('disconnect', () => {
      handleDisconnectOrLeave(socket);
    }));
  });

  function endBattle(roomId) {
    const battle = activeBattles.get(roomId);
    if (!battle) return;
    socketRoom.delete(battle.p1.socketId);
    socketRoom.delete(battle.p2.socketId);
    activeBattles.delete(roomId);
  }

  function handleDisconnectOrLeave(socket, specificRoomId = null) {
    waitingQueue = waitingQueue.filter(u => u.socketId !== socket.id);

    const roomId = socketRoom.get(socket.id);
    if (!roomId) return;
    if (specificRoomId && roomId !== specificRoomId) return;

    const battle = activeBattles.get(roomId);
    if (!battle) {
      socketRoom.delete(socket.id);
      return;
    }

    const wasPlaying = battle.status === 'playing';
    battle.status = 'finished';
    const winner = battle.p1.socketId === socket.id ? battle.p2 : battle.p1;
    const eligible = wasPlaying && playedLongEnough(battle);
    endBattle(roomId);

    battleIo.to(roomId).emit('battle_ended', {
      winnerId: winner.user.id,
      message: 'Raqib jangni tark etdi. Siz yutdingiz!'
    });

    // XP for winner by forfeit
    if (eligible) {
      awardBattleXp(winner.user.id, 15).catch((e) => console.error('Battle XP award error:', e?.message || e));
    }
  }
}

module.exports = setupBattleSockets;
module.exports._internals = { readRoomId, readCode, safe, MAX_CODE_LENGTH };
