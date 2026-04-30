import { cookies } from 'next/headers';
import { verifyAccessToken } from '@/lib/jwt';
import type { AuthSession } from '@/types';

export const ACCESS_COOKIE = 'sl_access';
export const REFRESH_COOKIE = 'sl_refresh';

export async function getSession(): Promise<AuthSession | null> {
  const store = await cookies();
  const token = store.get(ACCESS_COOKIE)?.value;
  if (!token) return null;
  return verifyAccessToken(token);
}

export async function requireSession(): Promise<AuthSession> {
  const session = await getSession();
  if (!session) {
    throw new AuthError('Unauthorized');
  }
  return session;
}

export class AuthError extends Error {
  status = 401;
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'AuthError';
  }
}
