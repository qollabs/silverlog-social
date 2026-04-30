// FCM push notification helper via Firebase Admin.
// Stub-friendly: if Firebase env vars are missing, logs to console.

import type { App } from 'firebase-admin/app';

let app: App | null = null;

async function getApp(): Promise<App | null> {
  if (app) return app;
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  const { initializeApp, getApps, cert } = await import('firebase-admin/app');
  app = getApps()[0] ?? initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
  return app;
}

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

export async function sendPushToTokens(tokens: string[], payload: PushPayload): Promise<void> {
  if (tokens.length === 0) return;

  const a = await getApp();
  if (!a) {
    console.log('[FCM stub] Would send to', tokens.length, 'tokens:', payload);
    return;
  }

  const { getMessaging } = await import('firebase-admin/messaging');
  const messaging = getMessaging(a);

  await messaging.sendEachForMulticast({
    tokens,
    notification: { title: payload.title, body: payload.body },
    data: payload.data,
    android: { priority: 'high' },
    apns: { payload: { aps: { sound: 'default' } } },
  });
}
