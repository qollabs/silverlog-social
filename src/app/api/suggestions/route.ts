import { NextResponse } from 'next/server';
import { requireSession, AuthError } from '@/lib/auth';
import { suggestForUser } from '@/lib/match';

// On-demand AI matching — called when user opens "둘러보기" tab
export async function GET() {
  try {
    const session = await requireSession();
    const result = await suggestForUser(session.userId);
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: 401 });
    console.error(e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
