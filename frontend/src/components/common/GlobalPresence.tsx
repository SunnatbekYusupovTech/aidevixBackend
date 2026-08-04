'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useSelector } from 'react-redux';
import { io, Socket } from 'socket.io-client';
import { RootState } from '@/store';

export default function GlobalPresence() {
  const pathname = usePathname();
  const user = useSelector((state: RootState) => state.auth.user);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
    socketRef.current = io(backendUrl);

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    if (socketRef.current) {
      socketRef.current.emit('presence:update', {
        path: pathname,
        user: user ? { id: user._id, username: user.username, email: user.email, name: user.name || user.username } : null
      });
    }
  }, [pathname, user]);
  
  return null;
}
