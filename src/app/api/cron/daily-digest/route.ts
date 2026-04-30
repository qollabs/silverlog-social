import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { User } from '@/models/User';
import { suggestForUser } from '@/lib/match';
import { sendPushToTokens } from '@/lib/push';

/**
 * Vercel Cron entry — schedule via vercel.json:
 *   { "crons": [{ "path": "/api/cron/daily-digest", "schedule": "0 0 * * *" }] }
 *   (KST 09:00 = UTC 00:00)
 *
 * For each onboarded active user, generate suggestions and push the top one.
 * For 50 users this is trivially cheap; we'd batch + rate-limit at scale.
 */
export async function GET(req: NextRequest) {
  // Vercel Cron sends an Authorization header
  const authHeader = req.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await connectDB();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const users = await User.find({
    onboardedAt: { $ne: null },
    lastActiveAt: { $gte: sevenDaysAgo },
    fcmTokens: { $exists: true, $ne: [] },
  }).lean();

  let pushed = 0;
  for (const user of users) {
    try {
      const { people, events } = await suggestForUser(String(user._id));
      const top = events[0] ?? null;
      const topPerson = people[0] ?? null;
      if (!top && !topPerson) continue;

      const title = top
        ? '오늘 추천 행사가 있어요'
        : '관심사가 비슷한 이웃이 있어요';
      const body = top
        ? `"${top.title}" — ${top.reason}`
        : `${topPerson!.name}님과 ${topPerson!.reason}`;

      await sendPushToTokens(user.fcmTokens ?? [], {
        title,
        body,
        data: { type: 'daily_digest' },
      });
      pushed += 1;
    } catch (err) {
      console.error('[cron] failed for user', user._id, err);
    }
  }

  return NextResponse.json({ ok: true, pushed, candidates: users.length });
}
