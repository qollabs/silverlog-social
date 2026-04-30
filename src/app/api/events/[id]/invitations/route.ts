import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/db';
import { Event } from '@/models/Event';
import { User } from '@/models/User';
import { Invitation } from '@/models/Invitation';
import { requireSession, AuthError } from '@/lib/auth';
import { sendPushToTokens } from '@/lib/push';

const SendBody = z.object({
  userIds: z.array(z.string()).min(1).max(20),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSession();
    const { id: eventId } = await params;
    const body = await req.json();
    const parsed = SendBody.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    await connectDB();
    const event = await Event.findById(eventId).lean();
    if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (String(event.createdBy) !== session.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const inviteeIds = parsed.data.userIds;

    // Upsert invitations — idempotent, re-invite resets to pending
    await Promise.all(
      inviteeIds.map((uid) =>
        Invitation.findOneAndUpdate(
          { event: eventId, toUser: uid },
          { $set: { fromUser: session.userId, status: 'pending' } },
          { upsert: true },
        ),
      ),
    );

    const invitees = await User.find({ _id: { $in: inviteeIds } })
      .select('fcmTokens')
      .lean();
    const tokens = invitees.flatMap((u) => u.fcmTokens ?? []);
    if (tokens.length > 0) {
      await sendPushToTokens(tokens, {
        title: `${session.name}님의 초대가 도착했어요`,
        body: `"${event.title}" 행사에 초대받으셨습니다. 참여해보실래요?`,
        data: { type: 'invitation', eventId },
      });
    }

    return NextResponse.json({ ok: true, invited: inviteeIds.length });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: 401 });
    console.error(e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
