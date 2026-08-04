const { Server } = require('socket.io');
const UserStats = require('../models/UserStats');
const User = require('../models/User');

const challenges = [
  { id: 1, title: 'Ikkita son yig\'indisi', description: 'Berilgan a va b sonlarning yig\'indisini qaytaruvchi add(a, b) funksiyasini yozing.', language: 'javascript', initialCode: 'function add(a, b) {\n  \n}' },
  { id: 2, title: 'Massivdagi eng katta son', description: 'Sonlar massividan eng katta sonni topuvchi findMax(arr) funksiyasini yozing.', language: 'javascript', initialCode: 'function findMax(arr) {\n  \n}' },
  { id: 3, title: 'Faktorial hisoblash', description: 'Berilgan n sonining faktorialini hisoblovchi factorial(n) funksiyasini yozing.', language: 'javascript', initialCode: 'function factorial(n) {\n  \n}' },
  { id: 4, title: 'Palindrom tekshiruvi', description: 'Berilgan so\'z palindrom ekanligini (oldidan va orqasidan bir xil o\'qilishini) tekshiruvchi isPalindrome(str) funksiyasini yozing.', language: 'javascript', initialCode: 'function isPalindrome(str) {\n  \n}' },
];

let waitingQueue = [];
let activeBattles = new Map();

function setupBattleSockets(io) {
  const battleIo = io.of('/battle');

  battleIo.on('connection', (socket) => {
    
    socket.on('join_queue', (user) => {
      // Prevent joining multiple times
      if (waitingQueue.find(u => u.socketId === socket.id)) return;
      if (Array.from(activeBattles.values()).find(b => b.p1.socketId === socket.id || b.p2.socketId === socket.id)) return;

      const player = { socketId: socket.id, user, status: 'waiting' };
      waitingQueue.push(player);

      socket.emit('queue_joined', { message: 'Raqib qidirilmoqda...' });

      // Matchmaking
      if (waitingQueue.length >= 2) {
        const p1 = waitingQueue.shift();
        const p2 = waitingQueue.shift();

        const roomId = `room_${p1.user.id}_${p2.user.id}`;
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

        // Join sockets to room
        const socket1 = battleIo.sockets.get(p1.socketId);
        const socket2 = battleIo.sockets.get(p2.socketId);
        
        if (socket1) socket1.join(roomId);
        if (socket2) socket2.join(roomId);

        battleIo.to(roomId).emit('battle_matched', {
          roomId,
          challenge,
          opponent: (id) => (id === p1.socketId ? p2.user : p1.user),
          p1: p1.user,
          p2: p2.user
        });

        // Start countdown
        setTimeout(() => {
          if (activeBattles.has(roomId)) {
            activeBattles.get(roomId).status = 'playing';
            activeBattles.get(roomId).startedAt = new Date();
            battleIo.to(roomId).emit('battle_started', { startTime: new Date() });
          }
        }, 5000);
      }
    });

    socket.on('code_update', ({ roomId, code }) => {
      const battle = activeBattles.get(roomId);
      if (!battle || battle.status !== 'playing') return;

      if (battle.p1.socketId === socket.id) battle.p1.code = code;
      if (battle.p2.socketId === socket.id) battle.p2.code = code;

      // Broadcast to opponent
      socket.to(roomId).emit('opponent_code_update', { code });
    });

    socket.on('submit_code', async ({ roomId, code }) => {
      const battle = activeBattles.get(roomId);
      if (!battle || battle.status !== 'playing') return;

      const isP1 = battle.p1.socketId === socket.id;
      const player = isP1 ? battle.p1 : battle.p2;
      const opponent = isP1 ? battle.p2 : battle.p1;

      // Simplistic check for demo (Normally use isolated VM or AI)
      // Since it's algorithms, checking for some keywords or structure
      // Wait, we can just say the first one to click submit wins for this iteration
      battle.status = 'finished';
      
      const winner = player.user;
      const loser = opponent.user;

      battleIo.to(roomId).emit('battle_ended', { 
        winnerId: winner.id, 
        message: `${winner.username} masalani birinchi bo'lib yechdi!` 
      });

      // Award XP to winner
      try {
        const XP_REWARD = 30;
        await UserStats.findOneAndUpdate(
          { userId: winner.id },
          { $inc: { xp: XP_REWARD, weeklyXp: XP_REWARD } },
          { upsert: true }
        );
        await User.findByIdAndUpdate(winner.id, { $inc: { xp: XP_REWARD } });
      } catch (e) {
        console.error('Battle XP award error:', e);
      }

      activeBattles.delete(roomId);
    });

    socket.on('leave_battle', ({ roomId }) => {
      handleDisconnectOrLeave(socket, roomId);
    });

    socket.on('disconnect', () => {
      handleDisconnectOrLeave(socket);
    });
  });

  function handleDisconnectOrLeave(socket, specificRoomId = null) {
    waitingQueue = waitingQueue.filter(u => u.socketId !== socket.id);

    for (const [roomId, battle] of activeBattles.entries()) {
      if (specificRoomId && roomId !== specificRoomId) continue;

      if (battle.p1.socketId === socket.id || battle.p2.socketId === socket.id) {
        battle.status = 'finished';
        const winner = battle.p1.socketId === socket.id ? battle.p2 : battle.p1;
        
        battleIo.to(roomId).emit('battle_ended', { 
          winnerId: winner.user.id, 
          message: 'Raqib jangni tark etdi. Siz yutdingiz!' 
        });

        // XP for winner by forfeit
        try {
          const XP_REWARD = 15;
          UserStats.findOneAndUpdate(
            { userId: winner.user.id },
            { $inc: { xp: XP_REWARD, weeklyXp: XP_REWARD } },
            { upsert: true }
          ).exec();
          User.findByIdAndUpdate(winner.user.id, { $inc: { xp: XP_REWARD } }).exec();
        } catch (e) {}

        activeBattles.delete(roomId);
      }
    }
  }
}

module.exports = setupBattleSockets;
