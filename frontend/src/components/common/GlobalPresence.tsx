'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useSelector } from 'react-redux';
import type { Socket } from 'socket.io-client';
import { RootState } from '@/store';
import { createAuthedSocket } from '@/utils/socketClient';

// P-F01 / SOCK-01: presence socket faqat login qilgan userlar uchun ochiladi.
// Identity server tomonda token'dan olinadi — client faqat `path` yuboradi (email yo'q).
export default function GlobalPresence() {
  const pathname = usePathname();
  const userId = useSelector((state: RootState) => state.auth.user?._id);
  const socketRef = useRef<Socket | null>(null);
  const pathRef = useRef(pathname);
  pathRef.current = pathname;

  useEffect(() => {
    if (!userId) return;
    const socket = createAuthedSocket();
    socketRef.current = socket;
    // Har (qayta) ulanishda joriy sahifani yuborish
    socket.on('connect', () => {
      socket.emit('presence:update', { path: pathRef.current });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [userId]);

  useEffect(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('presence:update', { path: pathname });
    }
  }, [pathname]);

  return null;
}
