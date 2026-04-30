import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Event } from '@/models/Event';
import { User } from '@/models/User';
import { requireSession, AuthError } from '@/lib/auth';
import { deriveTagsFromEvent } from '@/lib/tags';
import { findResidentsToNotify } from '@/lib/match';
import { sendPushToTokens } from '@/lib/push';

/**
 * POST /api/events/:id/signup
 *
 * KEY FEATURE: Upon signup, the user's profile is updated with derived tags
 * from the event (keywords, time-of-day, day-of-week, category). These tags
 * accumulate over time and become the matching signal for the AI suggester.
 *
 * Side effect: triggers push notifications to other residents whose interests
 * match the event tags ("event-triggered" matching mode).
 */
export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id } = await ctx.params;

    await connectDB();
    const event = await Event.findById(id);
    if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (event.cancelledAt) {
      return NextResponse.json({ error: '취소된 이벤트입니다.' }, { status: 400 });
    }
    if (new Date(event.startAt) < new Date()) {
      return NextResponse.json({ error: '이미 종료된 이벤트입니다.' }, { status: 400 });
    }
    if (event.attendees.some((a) => String(a) === session.userId)) {
      return NextResponse.json({ error: '이미 신청하셨습니다.' }, { status: 400 });
    }
    if (event.attendees.length >= event.maxAttendees) {
      return NextResponse.json({ error: '정원이 마감되었습니다.' }, { status: 400 });
    }

    // Atomic-ish add to attendees with capacity check
    const updated = await Event.findOneAndUpdate(
      {
        _id: event._id,
        $expr: { $lt: [{ $size: '$attendees' }, '$maxAttendees'] },
      },
      { $addToSet: { attendees: session.userId } },
      { new: true },
    );
    if (!updated) {
      return NextResponse.json({ error: '정원이 마감되었습니다.' }, { status: 400 });
    }

    // ---- KEY FEATURE: derive tags and update user profile ----
    const newTags = deriveTagsFromEvent({
      title: updated.title,
      tags: updated.tags ?? [],
      category: updated.category ?? 'social',
      startAt: updated.startAt,
    });

    await User.findByIdAndUpdate(session.userId, {
      $addToSet: { derivedTags: { $each: newTags } },
    });

    // ---- Side effect: notify matching residents (fire-and-forget) ----
    // We don't await this — we don't want signup latency to spike.
    void notifyMatchingResidents(String(updated._id), session.userId).catch((err) =>
      console.error('[signup] notification side effect failed:', err),
    );

    return NextResponse.json({
      ok: true,
      event: {
        ...updated.toJSON(),
        _id: String(updated._id),
      },
      derivedTags: newTags,
    });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: 401 });
    console.error(e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

async function notifyMatchingResidents(eventId: string, signerUserId: string) {
  const userIds = await findResidentsToNotify(eventId, signerUserId);
  if (userIds.length === 0) return;

  const event = await Event.findById(eventId).lean();
  const signer = await User.findById(signerUserId).select('name').lean();
  if (!event || !signer) return;

  const targets = await User.find({ _id: { $in: userIds } })
    .select('fcmTokens')
    .lean();
  const tokens = targets.flatMap((u) => u.fcmTokens ?? []);
  if (tokens.length === 0) return;

  await sendPushToTokens(tokens, {
    title: '관심 있을 만한 이벤트가 있어요',
    body: `${signer.name}님이 "${event.title}"에 신청했습니다. 함께 참여해 보세요.`,
    data: { type: 'event_match', eventId },
  });
}

// Cancel signup
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id } = await ctx.params;

    await connectDB();
    const event = await Event.findById(id);
    if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (new Date(event.startAt) < new Date()) {
      return NextResponse.json({ error: '이미 종료된 이벤트입니다.' }, { status: 400 });
    }

    await Event.findByIdAndUpdate(event._id, {
      $pull: { attendees: session.userId },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: 401 });
    console.error(e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
