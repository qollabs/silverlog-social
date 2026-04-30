import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { connectDB } from '@/lib/db';
import { Otp } from '@/models/Otp';
import { sendOtpSms } from '@/lib/sms';

const Body = z.object({
  phone: z.string().regex(/^(\+[1-9]\d{7,14}|01[016789]\d{7,8})$/, '올바른 전화번호를 입력해 주세요.'),
});

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => ({}));
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { phone } = parsed.data;

  await connectDB();

  // Rate limit: max 3 codes per phone per 10 min
  const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000);
  const recent = await Otp.countDocuments({ phone, createdAt: { $gte: tenMinAgo } });
  if (recent >= 3) {
    return NextResponse.json(
      { error: '너무 많은 요청입니다. 잠시 후 다시 시도해 주세요.' },
      { status: 429 },
    );
  }

  // Generate 6-digit code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const codeHash = await bcrypt.hash(code, 8);
  const expiresAt = new Date(Date.now() + 3 * 60 * 1000); // 3 min

  await Otp.create({ phone, codeHash, expiresAt });

  const result = await sendOtpSms(phone, code);
  if (!result.success) {
    return NextResponse.json({ error: 'SMS 전송에 실패했습니다.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, expiresIn: 180 });
}
