import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/db';
import { User } from '@/models/User';
import { signAccessToken, signRefreshToken, verifyRefreshToken, TOKEN_TTL } from '@/lib/jwt';
import { ACCESS_COOKIE, REFRESH_COOKIE } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) {
    return NextResponse.json({ error: 'No refresh token' }, { status: 401 });
  }

  const payload = await verifyRefreshToken(refreshToken);
  if (!payload) {
    return NextResponse.json({ error: 'Invalid refresh token' }, { status: 401 });
  }

  await connectDB();
  const user = await User.findById(payload.userId);
  if (!user || !user.refreshTokenHash || !user.refreshTokenExpiresAt) {
    return NextResponse.json({ error: 'Session not found' }, { status: 401 });
  }

  if (user.refreshTokenExpiresAt < new Date()) {
    return NextResponse.json({ error: 'Refresh token expired' }, { status: 401 });
  }

  const matches = await bcrypt.compare(refreshToken, user.refreshTokenHash);
  if (!matches) {
    return NextResponse.json({ error: 'Refresh token mismatch' }, { status: 401 });
  }

  // Rotate: issue new pair, persist new hash
  const newAccess = await signAccessToken({ userId: String(user._id), name: user.name });
  const newRefresh = await signRefreshToken({ userId: String(user._id) });

  user.refreshTokenHash = await bcrypt.hash(newRefresh, 8);
  user.refreshTokenExpiresAt = new Date(Date.now() + TOKEN_TTL.refresh * 1000);
  user.lastActiveAt = new Date();
  await user.save();

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ACCESS_COOKIE, newAccess, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: TOKEN_TTL.access,
  });
  res.cookies.set(REFRESH_COOKIE, newRefresh, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: TOKEN_TTL.refresh,
  });
  return res;
}
