'use client';

import { useEffect, useRef } from 'react';
import { listenForFcmToken } from '@/lib/flutter-bridge';

// Registers the device FCM token with the backend once per session.
// Must run inside an authenticated context (valid session cookie required).
export function useFcmToken(): void {
  const registered = useRef(false);

  useEffect(() => {
    const unsubscribe = listenForFcmToken(async (token) => {
      if (registered.current) return;
      registered.current = true;

      try {
        await fetch('/api/me/fcm-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
      } catch {
        registered.current = false;
      }
    });

    return unsubscribe;
  }, []);
}
