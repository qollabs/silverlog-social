import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { User } from '@/models/User';
import { requireSession, AuthError } from '@/lib/auth';

export async function GET() {
  try {
    await requireSession();
    await connectDB();

    const users = await User.find({ onboardedAt: { $ne: null } })
      .select('name interests derivedTags createdAt')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      residents: users.map((u) => ({
        _id: String(u._id),
        name: u.name,
        interests: u.interests ?? [],
        derivedTags: u.derivedTags ?? [],
        joinedAt: u.createdAt,
      })),
    });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: 401 });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
