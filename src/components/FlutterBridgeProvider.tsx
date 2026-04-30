'use client';

import { useFcmToken } from '@/hooks/useFcmToken';

// Mounts the Flutter ↔ Web bridge inside the authenticated layout.
// No-op when running outside a Flutter WebView.
export function FlutterBridgeProvider({ children }: { children: React.ReactNode }) {
  useFcmToken();
  return <>{children}</>;
}
