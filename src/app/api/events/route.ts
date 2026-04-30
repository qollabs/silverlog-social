import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/db';
import { Event } from '@/models/Event';
import { User } from '@/models/User';
import { requireSession, AuthError } from '@/lib/auth';
import { findResidentsToNotify } from '@/lib/match';
import { sendPushToTokens } from '@/lib/push';

// GET /api/events?bucket=open|closed|past
export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const bucket = req.nextUrl.searchParams.get('bucket') ?? 'open';
    const now = new Date();

    await connectDB();

    // Use aggregation to compute attendeeCount and bucket in one query
    let match: Record<string, unknown> = { cancelledAt: null };
    let sort: Record<string, 1 | -1> = { startAt: 1 };

    if (bucket === 'past') {
      match = { ...match, startAt: { $lt: now } };
      sort = { startAt: -1 };
    } else {
      match = { ...match, startAt: { $gte: now } };
    }

    const all = await Event.find(match).sort(sort).limit(100).lean();

    const decorated = all.map((e) => {
      const attendeeCount = e.attendees?.length ?? 0;
      const isFull = attendeeCount >= e.maxAttendees;
      const isPast = new Date(e.startAt) < now;
      const isAttending = e.attendees?.some(
        (a: unknown) => String(a) === session.userId,
      );
      return {
        ...e,
        _id: String(e._id),
        attendees: e.attendees?.map(String) ?? [],
        createdBy: String(e.createdBy),
        attendeeCount,
        isFull,
        isPast,
        isAttending,
      };
    });

    let filtered = decorated;
    if (bucket === 'open') filtered = decorated.filter((e) => !e.isPast && !e.isFull);
    else if (bucket === 'closed') filtered = decorated.filter((e) => !e.isPast && e.isFull);
    // past already filtered above

    return NextResponse.json({ events: filtered });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: 401 });
    console.error(e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

const CreateBody = z.object({
  title: z.string().min(2).max(100),
  description: z.string().max(2000).optional().default(''),
  location: z.string().min(1).max(100),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  maxAttendees: z.number().int().min(1).max(500),
  tags: z.array(z.string().max(30)).max(15).optional().default([]),
  category: z.enum(['physical', 'religion', 'hobby', 'food', 'social']).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = await req.json();
    const parsed = CreateBody.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    if (new Date(parsed.data.endAt) <= new Date(parsed.data.startAt)) {
      return NextResponse.json({ error: '종료 시간은 시작 시간 이후여야 합니다.' }, { status: 400 });
    }

    await connectDB();
    const event = await Event.create({
      ...parsed.data,
      startAt: new Date(parsed.data.startAt),
      endAt: new Date(parsed.data.endAt),
      createdBy: session.userId,
      // Creator auto-attends
      attendees: [session.userId],
    });

    // Fire-and-forget: notify matching residents that a new event was created
    void broadcastNewEvent(String(event._id), session.userId, event.title).catch((err) =>
      console.error('[events/create] broadcast failed:', err),
    );

    return NextResponse.json({ ok: true, event });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: 401 });
    console.error(e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

async function broadcastNewEvent(eventId: string, creatorId: string, title: string) {
  const userIds = await findResidentsToNotify(eventId, creatorId);
  if (userIds.length === 0) return;

  const targets = await User.find({ _id: { $in: userIds } }).select('fcmTokens').lean();
  const tokens = targets.flatMap((u) => u.fcmTokens ?? []);
  if (tokens.length === 0) return;

  await sendPushToTokens(tokens, {
    title: '관심 행사 알림',
    body: `"${title}" 새 행사가 생겼어요. 참여해보세요!`,
    data: { type: 'new_event', eventId },
  });
}
