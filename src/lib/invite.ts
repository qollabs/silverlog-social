import OpenAI from 'openai';
import { connectDB } from '@/lib/db';
import { User } from '@/models/User';
import { Event } from '@/models/Event';
import type { Interest } from '@/types';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = process.env.OPENAI_MATCHING_MODEL ?? 'gpt-4o-mini';

export interface InviteeSuggestion {
  userId: string;
  name: string;
  interests: { label: string }[];
  sharedTags: string[];
  reason: string;
}

export async function suggestInviteesForEvent(
  eventId: string,
  excludeUserIds: string[],
): Promise<InviteeSuggestion[]> {
  await connectDB();

  const event = await Event.findById(eventId).lean();
  if (!event) return [];

  const eventTags = [
    ...(event.tags ?? []),
    ...(event.category ? [event.category] : []),
  ];

  const candidates = await User.find({
    _id: { $nin: excludeUserIds },
    $or: [
      { derivedTags: { $in: eventTags } },
      { 'interests.label': { $in: eventTags } },
      { 'interests.category': event.category ?? '__none__' },
    ],
  })
    .select('_id name interests derivedTags')
    .limit(30)
    .lean();

  if (candidates.length === 0) return [];

  const scored = candidates
    .map((u) => {
      const userTags = new Set([
        ...(u.derivedTags ?? []),
        ...(u.interests ?? []).map((i: Interest) => i.label),
        ...(u.interests ?? []).map((i: Interest) => i.category),
      ]);
      const shared = eventTags.filter((t) => userTags.has(t));
      return { user: u, overlap: shared.length, sharedTags: shared };
    })
    .filter((x) => x.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap)
    .slice(0, 20);

  if (scored.length === 0) return [];

  try {
    const prompt = `시니어 입주민 소셜 플랫폼입니다. 다음 행사에 초대하기 좋은 이웃을 추천해주세요.
행사: ${JSON.stringify({ title: event.title, tags: event.tags, category: event.category })}
후보 이웃들: ${JSON.stringify(
      scored.map(({ user, sharedTags }) => ({
        id: String(user._id),
        name: user.name,
        interests: (user.interests ?? []).map((i: Interest) => i.label),
        sharedTags,
      })),
    )}

각 후보에 대해 왜 이 행사에 어울리는지 한국어 한 문장으로 작성하세요.
JSON으로만 응답: { "suggestions": [{ "userId": "...", "reason": "..." }] }
최대 10명.`;

    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.4,
    });

    const raw = JSON.parse(completion.choices[0]?.message?.content ?? '{}');
    const reasonMap = new Map<string, string>(
      (raw.suggestions ?? []).map((s: { userId: string; reason: string }) => [s.userId, s.reason]),
    );

    return scored.slice(0, 10).map(({ user, sharedTags }) => ({
      userId: String(user._id),
      name: user.name,
      interests: (user.interests ?? []).map((i: Interest) => ({ label: i.label })),
      sharedTags,
      reason: reasonMap.get(String(user._id)) ?? '비슷한 관심사를 가진 이웃입니다.',
    }));
  } catch {
    return scored.slice(0, 10).map(({ user, sharedTags }) => ({
      userId: String(user._id),
      name: user.name,
      interests: (user.interests ?? []).map((i: Interest) => ({ label: i.label })),
      sharedTags,
      reason: '비슷한 관심사를 가진 이웃입니다.',
    }));
  }
}
