import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/db';
import { Invitation } from '@/models/Invitation';
import { Event } from '@/models/Event';
import { requireSession, AuthError } from '@/lib/auth';

const PatchBody = z.object({
  status: z.enum(['accepted', 'declined']),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ invitationId: string }> },
) {
  try {
    const session = await requireSession();
    const { invitationId } = await params;
    const body = await req.json();
    const parsed = PatchBody.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    await connectDB();
    const invitation = await Invitation.findOne({
      _id: invitationId,
      toUser: session.userId,
      status: 'pending',
    });
    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    invitation.status = parsed.data.status;
    await invitation.save();

    let joined = false;
    if (parsed.data.status === 'accepted') {
      // Atomic add — respects capacity, idempotent
      const updated = await Event.findOneAndUpdate(
        {
          _id: invitation.event,
          cancelledAt: null,
          attendees: { $ne: session.userId },
          $expr: { $lt: [{ $size: '$attendees' }, '$maxAttendees'] },
        },
        { $addToSet: { attendees: session.userId } },
      );
      joined = !!updated;
    }

    return NextResponse.json({ ok: true, joined });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: 401 });
    console.error(e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
