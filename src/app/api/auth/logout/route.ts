import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { User } from '@/models/User';
import { getSession } from '@/lib/auth';
import { ACCESS_COOKIE, REFRESH_COOKIE } from '@/lib/auth';

export async function POST() {
  const session = await getSession();
  if (session) {
    await connectDB();
    await User.findByIdAndUpdate(session.userId, {
      $set: { refreshTokenHash: null, refreshTokenExpiresAt: null },
    });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(ACCESS_COOKIE);
  res.cookies.delete(REFRESH_COOKIE);
  return res;
}
