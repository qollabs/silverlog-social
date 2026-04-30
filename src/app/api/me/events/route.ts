import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Event } from '@/models/Event';
import { requireSession, AuthError } from '@/lib/auth';

export async function GET() {
  try {
    const session = await requireSession();
    await connectDB();

    const now = new Date();
    const events = await Event.find({
      attendees: session.userId,
      cancelledAt: null,
    })
      .sort({ startAt: 1 })
      .lean();

    const decorated = events.map((e) => ({
      ...e,
      _id: String(e._id),
      attendees: e.attendees?.map(String) ?? [],
      createdBy: String(e.createdBy),
      attendeeCount: e.attendees?.length ?? 0,
      isPast: new Date(e.startAt) < now,
      isAttending: true,
    }));

    return NextResponse.json({ events: decorated });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: 401 });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
