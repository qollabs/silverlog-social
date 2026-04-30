import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/db';
import { User } from '@/models/User';
import { requireSession, AuthError } from '@/lib/auth';

const Body = z.object({
  interests: z
    .array(
      z.object({
        category: z.enum(['physical', 'religion', 'hobby', 'food', 'social']),
        label: z.string().min(1).max(30),
      }),
    )
    .max(20),
  allergies: z
    .array(
      z.object({
        label: z.string().min(1).max(30),
        severity: z.enum(['mild', 'moderate', 'severe']).optional(),
      }),
    )
    .max(20)
    .optional()
    .default([]),
  preferredTimeSlots: z.array(z.string()).max(10).optional().default([]),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = await req.json();
    const parsed = Body.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: '입력값을 확인해 주세요.' }, { status: 400 });
    }

    await connectDB();
    const user = await User.findByIdAndUpdate(
      session.userId,
      {
        $set: {
          interests: parsed.data.interests,
          allergies: parsed.data.allergies,
          preferredTimeSlots: parsed.data.preferredTimeSlots,
          onboardedAt: new Date(),
        },
      },
      { new: true },
    );
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    return NextResponse.json({ ok: true, user });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: 401 });
    console.error(e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
