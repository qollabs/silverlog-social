import { SignJWT, jwtVerify } from 'jose';
import type { AuthSession } from '@/types';

const accessSecret = new TextEncoder().encode(
  process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret-change-me',
);
const refreshSecret = new TextEncoder().encode(
  process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret-change-me',
);

const ACCESS_TTL = parseInt(process.env.JWT_ACCESS_TTL ?? '900', 10);       // 15 min
const REFRESH_TTL = parseInt(process.env.JWT_REFRESH_TTL ?? '2592000', 10); // 30 days

export async function signAccessToken(payload: { userId: string; name: string }): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TTL}s`)
    .sign(accessSecret);
}

export async function signRefreshToken(payload: { userId: string }): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${REFRESH_TTL}s`)
    .sign(refreshSecret);
}

export async function verifyAccessToken(token: string): Promise<AuthSession | null> {
  try {
    const { payload } = await jwtVerify(token, accessSecret);
    return payload as unknown as AuthSession;
  } catch {
    return null;
  }
}

export async function verifyRefreshToken(token: string): Promise<{ userId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, refreshSecret);
    return { userId: payload.userId as string };
  } catch {
    return null;
  }
}

export const TOKEN_TTL = { access: ACCESS_TTL, refresh: REFRESH_TTL };
