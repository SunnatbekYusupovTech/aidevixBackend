'use client';

import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/hooks/useAuth';
import { API_BASE_URL } from '@/utils/constants'; // Standard backend URL without /api if we append socket

const SOCKET_URL = API_BASE_URL.replace('/api/', ''); // assuming socket runs on root

export default function BattleClient() {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [status, setStatus] = useState<'idle' | 'waiting' | 'matched' | 'playing' | 'finished'>('idle');
  const [message, setMessage] = useState('');
  const [challenge, setChallenge] = useState<any>(null);
  const [opponent, setOpponent] = useState<any>(null);
  const [roomId, setRoomId] = useState<string>('');
  const [code, setCode] = useState('');
  const [opponentCode, setOpponentCode] = useState('');
  const [winnerId, setWinnerId] = useState<string | null>(null);

  // Reconnect when user loads
  useEffect(() => {
    if (!user) return;
    const newSocket = io(`${SOCKET_URL}/battle`, { transports: ['websocket', 'polling'] });
    setSocket(newSocket);

    newSocket.on('queue_joined', (data) => {
      setStatus('waiting');
      setMessage(data.message);
    });

    newSocket.on('battle_matched', (data) => {
      setStatus('matched');
      setRoomId(data.roomId);
      setChallenge(data.challenge);
      setCode(data.challenge.initialCode);
      setOpponentCode(data.challenge.initialCode);
      setOpponent(data.p1.id === user.id ? data.p2 : data.p1);
      setMessage('Raqib topildi! O\'yin tez orada boshlanadi...');
    });

    newSocket.on('battle_started', () => {
      setStatus('playing');
      setMessage('');
    });

    newSocket.on('opponent_code_update', (data) => {
      setOpponentCode(data.code);
    });

    newSocket.on('battle_ended', (data) => {
      setStatus('finished');
      setWinnerId(data.winnerId);
      setMessage(data.message);
    });

    return () => {
      newSocket.disconnect();
    };
  }, [user]);

  const findMatch = () => {
    if (!socket || !user) return;
    socket.emit('join_queue', { id: user._id || user.id, username: user.username, avatar: user.avatar });
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newCode = e.target.value;
    setCode(newCode);
    if (socket && roomId && status === 'playing') {
      socket.emit('code_update', { roomId, code: newCode });
    }
  };

  const submitCode = () => {
    if (!socket || !roomId) return;
    socket.emit('submit_code', { roomId, code });
  };

  const leaveBattle = () => {
    if (socket && roomId) {
      socket.emit('leave_battle', { roomId });
    }
    setStatus('idle');
    setRoomId('');
    setOpponent(null);
    setChallenge(null);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0A0E1A] flex items-center justify-center text-white pt-24 pb-16 px-4">
        <p>Iltimos, jang qilish uchun tizimga kiring.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0E1A] text-slate-200 pt-24 pb-16 px-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-black text-white text-center mb-2">⚔️ Code Battle</h1>
        <p className="text-slate-400 text-center mb-8">Raqiblarga qarshi kod yozing va eng zo'ri ekanligingizni isbotlang!</p>

        {status === 'idle' && (
          <div className="flex justify-center">
            <button 
              onClick={findMatch}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-lg shadow-indigo-500/30 transition-all transform hover:scale-105"
            >
              🚀 Jang qidirish
            </button>
          </div>
        )}

        {status === 'waiting' && (
          <div className="text-center py-20">
            <div className="w-16 h-16 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-xl font-bold text-white animate-pulse">{message}</p>
          </div>
        )}

        {(status === 'matched' || status === 'playing' || status === 'finished') && challenge && (
          <div className="bg-[#111726] rounded-2xl border border-white/5 overflow-hidden flex flex-col md:flex-row shadow-2xl">
            {/* Sidebar / Challenge Info */}
            <div className="md:w-1/3 p-6 border-b md:border-b-0 md:border-r border-white/5 flex flex-col">
              <h2 className="text-xl font-bold text-white mb-2">{challenge.title}</h2>
              <p className="text-slate-400 text-sm mb-6 flex-1">{challenge.description}</p>
              
              <div className="bg-[#0A0E1A] rounded-xl p-4 mb-4 border border-white/5 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <img src={user.avatar || \`https://ui-avatars.com/api/?name=\${user.username}\`} className="w-10 h-10 rounded-full border-2 border-indigo-500" />
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Siz</p>
                    <p className="font-bold text-white">{user.username}</p>
                  </div>
                </div>
                <div className="text-2xl font-black text-indigo-500">VS</div>
                <div className="flex items-center gap-3 flex-row-reverse text-right">
                  <img src={opponent?.avatar || \`https://ui-avatars.com/api/?name=\${opponent?.username}\`} className="w-10 h-10 rounded-full border-2 border-rose-500" />
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Raqib</p>
                    <p className="font-bold text-white">{opponent?.username}</p>
                  </div>
                </div>
              </div>

              {status === 'matched' && <p className="text-amber-400 font-bold text-center animate-pulse">Tayyorlaning...</p>}
              {status === 'playing' && (
                <button 
                  onClick={submitCode}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-colors mb-2"
                >
                  ✅ Yechimni yuborish
                </button>
              )}
              {status === 'finished' && (
                <div className="text-center">
                  <p className={\`text-xl font-black mb-4 \${winnerId === user.id || winnerId === user._id ? 'text-emerald-400' : 'text-rose-400'}\`}>
                    {message}
                  </p>
                  <button onClick={leaveBattle} className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-2 rounded-xl font-bold">
                    Chiqish
                  </button>
                </div>
              )}
            </div>

            {/* Editors */}
            <div className="md:w-2/3 flex flex-col h-[500px] md:h-auto">
              <div className="flex-1 border-b border-white/5 relative">
                <div className="absolute top-0 right-0 bg-indigo-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg z-10">Sizning kodingiz</div>
                <textarea
                  value={code}
                  onChange={handleCodeChange}
                  disabled={status !== 'playing'}
                  spellCheck={false}
                  className="w-full h-full bg-[#0A0E1A] text-emerald-400 p-4 font-mono text-sm resize-none focus:outline-none focus:ring-inset focus:ring-1 focus:ring-indigo-500/50"
                />
              </div>
              <div className="flex-1 relative opacity-60">
                <div className="absolute top-0 right-0 bg-rose-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg z-10">Raqib kodi (Live)</div>
                <textarea
                  value={opponentCode}
                  readOnly
                  spellCheck={false}
                  className="w-full h-full bg-[#0A0E1A] text-rose-400 p-4 font-mono text-sm resize-none focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
