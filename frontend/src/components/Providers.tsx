'use client';

import { useEffect } from 'react';
import { Provider } from 'react-redux';
import store from '@/store';
import { Toaster } from 'react-hot-toast';
import { LangProvider } from '@/context/LangContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { SoundProvider } from '@/context/SoundContext';
import { checkAuthStatus, markAnonymous } from '@/store/slices/authSlice';
import { hasSessionHint, primeCsrfToken } from '@/api/axiosInstance';

import { useDispatch } from 'react-redux';

// Module-level flag — survives component remounts caused by hydration errors.
// useRef resets on remount; this does not.
let authCheckDispatched = false;

function AuthBootstrap() {
  const dispatch = useDispatch();

  useEffect(() => {
    if (!authCheckDispatched) {
      authCheckDispatched = true;
      // P-F08: anonymous visitors (no session hint) skip both round-trips; the
      // CSRF token is then fetched lazily by the 403->retry path on first mutation.
      if (!hasSessionHint()) {
        dispatch(markAnonymous());
        return;
      }
      // Cross-site clients need an X-CSRF-Token header on the first mutating
      // request (e.g. /api/auth/daily-reward, profile edit). Prime the
      // in-memory store before any of those fire so we don't rely on the
      // 403→retry path for the very first request.
      primeCsrfToken();
      dispatch(checkAuthStatus() as any);
    }
  }, [dispatch]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <AuthBootstrap />
      <ThemeProvider>
        <LangProvider>
          <SoundProvider>
              {children}
            <Toaster
              position="bottom-right"
              reverseOrder={false}
              toastOptions={{
                style: {
                  background: '#12141f',
                  color: '#e2e8f0',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                },
              }}
            />
          </SoundProvider>
        </LangProvider>
      </ThemeProvider>
    </Provider>
  );
}
