import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Invitation } from '@/models/Invitation';
import { requireSession, AuthError } from '@/lib/auth';

export async function GET() {
  try {
    const session = await requireSession();

    await connectDB();
    const invitations = await Invitation.find({
      toUser: session.userId,
      status: 'pending',
    })
      .sort({ createdAt: -1 })
      .populate('event', 'title location startAt endAt')
      .populate('fromUser', 'name')
      .limit(20)
      .lean();

    return NextResponse.json({ invitations });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: 401 });
    console.error(e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
