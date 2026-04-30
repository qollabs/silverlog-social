import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Event } from '@/models/Event';
import { requireSession, AuthError } from '@/lib/auth';
import { suggestInviteesForEvent } from '@/lib/invite';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSession();
    const { id } = await params;

    await connectDB();
    const event = await Event.findById(id).lean();
    if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (String(event.createdBy) !== session.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const suggestions = await suggestInviteesForEvent(
      id,
      (event.attendees ?? []).map(String),
    );

    return NextResponse.json({ suggestions });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: 401 });
    console.error(e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
