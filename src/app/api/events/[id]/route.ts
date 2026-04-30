import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Event } from '@/models/Event';
import { User } from '@/models/User';
import { requireSession, AuthError } from '@/lib/auth';

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id } = await ctx.params;
    await connectDB();

    const event = await Event.findById(id).lean();
    if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const attendees = await User.find({ _id: { $in: event.attendees } })
      .select('name interests')
      .lean();

    return NextResponse.json({
      event: {
        ...event,
        _id: String(event._id),
        createdBy: String(event.createdBy),
        attendees: attendees.map((a) => ({
          _id: String(a._id),
          name: a.name,
          interests: a.interests,
        })),
        attendeeCount: event.attendees?.length ?? 0,
        isFull: (event.attendees?.length ?? 0) >= event.maxAttendees,
        isPast: new Date(event.startAt) < new Date(),
        isAttending: event.attendees?.some((a: unknown) => String(a) === session.userId),
      },
    });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: 401 });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
