import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { connectDB } from '@/lib/db';
import { Otp } from '@/models/Otp';
import { User } from '@/models/User';
import { signAccessToken, signRefreshToken, TOKEN_TTL } from '@/lib/jwt';
import { ACCESS_COOKIE, REFRESH_COOKIE } from '@/lib/auth';

const Body = z.object({
  phone: z.string().regex(/^(\+[1-9]\d{7,14}|01[016789]\d{7,8})$/),
  name: z.string().min(2).max(20),
  code: z.string().regex(/^\d{6}$/),
});

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => ({}));
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: '입력값을 확인해 주세요.' }, { status: 400 });
  }
  const { phone, name, code } = parsed.data;

  await connectDB();

  // Find latest unconsumed OTP for this phone
  const otp = await Otp.findOne({ phone, consumed: false }).sort({ createdAt: -1 });
  if (!otp) {
    return NextResponse.json({ error: '인증번호를 다시 요청해 주세요.' }, { status: 400 });
  }

  if (otp.expiresAt < new Date()) {
    return NextResponse.json({ error: '인증번호가 만료되었습니다.' }, { status: 400 });
  }

  if (otp.attempts >= 5) {
    return NextResponse.json({ error: '시도 횟수를 초과했습니다.' }, { status: 429 });
  }

  const valid = await bcrypt.compare(code, otp.codeHash);
  if (!valid) {
    otp.attempts += 1;
    await otp.save();
    return NextResponse.json({ error: '인증번호가 일치하지 않습니다.' }, { status: 400 });
  }

  otp.consumed = true;
  await otp.save();

  // Find or create user
  let user = await User.findOne({ phone });
  let isNewUser = false;
  if (!user) {
    user = await User.create({ name, phone });
    isNewUser = true;
  } else if (user.name !== name) {
    // Update name if changed (lightweight identity check for PoC)
    user.name = name;
    await user.save();
  }

  // Issue tokens
  const accessToken = await signAccessToken({
    userId: String(user._id),
    name: user.name,
  });
  const refreshToken = await signRefreshToken({ userId: String(user._id) });

  // Store hash of refresh token (sliding session pattern from silverlog-admin)
  user.refreshTokenHash = await bcrypt.hash(refreshToken, 8);
  user.refreshTokenExpiresAt = new Date(Date.now() + TOKEN_TTL.refresh * 1000);
  user.lastActiveAt = new Date();
  await user.save();

  const res = NextResponse.json({
    ok: true,
    isNewUser,
    needsOnboarding: !user.onboardedAt,
    user: {
      _id: String(user._id),
      name: user.name,
      phone: user.phone,
    },
  });

  res.cookies.set(ACCESS_COOKIE, accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: TOKEN_TTL.access,
  });
  res.cookies.set(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: TOKEN_TTL.refresh,
  });

  return res;
}
