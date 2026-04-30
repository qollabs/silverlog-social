import OpenAI from 'openai';
import { connectDB } from '@/lib/db';
import { User } from '@/models/User';
import { Event } from '@/models/Event';
import type { Interest } from '@/types';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = process.env.OPENAI_MATCHING_MODEL ?? 'gpt-4o-mini';

export interface MatchSuggestion {
  userId: string;
  name: string;
  reason: string;
  sharedTags: string[];
}

export interface EventSuggestion {
  eventId: string;
  title: string;
  reason: string;
}

/**
 * Three trigger modes are supported by the API layer:
 *
 *  1. On-demand: called from the resident's home screen → suggestForUser()
 *  2. Cron (daily digest): /api/cron/daily-digest iterates active users → suggestForUser() + push
 *  3. Event-triggered: when a user signs up to an event → notifyMatchedResidents()
 *
 * Each path eventually calls the same scoring functions below, but the entry
 * points differ in *who* triggers and *who* gets notified.
 */

// ---------- 1 & 2: Suggest people + events FOR a given user ----------

export async function suggestForUser(userId: string): Promise<{
  people: MatchSuggestion[];
  events: EventSuggestion[];
}> {
  await connectDB();

  const me = await User.findById(userId).lean();
  if (!me) return { people: [], events: [] };

  // Pre-filter candidates with cheap MongoDB queries — keep AI cost low
  const myTagSet = new Set([
    ...(me.derivedTags ?? []),
    ...(me.interests ?? []).map((i: Interest) => i.label),
  ]);
  const myTagsArr = Array.from(myTagSet);

  // People: residents sharing at least one tag, excluding self
  const candidatePeople = await User.find({
    _id: { $ne: me._id },
    $or: [
      { derivedTags: { $in: myTagsArr } },
      { 'interests.label': { $in: myTagsArr } },
    ],
  })
    .limit(20)
    .lean();

  // Events: future, not full, not yet signed up, optional tag overlap
  const now = new Date();
  const candidateEvents = await Event.find({
    startAt: { $gt: now },
    cancelledAt: null,
    attendees: { $ne: me._id },
    $or: [
      { tags: { $in: myTagsArr } },
      { category: { $in: (me.interests ?? []).map((i: Interest) => i.category) } },
    ],
  })
    .limit(15)
    .lean();

  // Hand over to LLM for ranking + reason generation
  const ranked = await rankWithLLM(me, candidatePeople, candidateEvents);
  return ranked;
}

// ---------- 3: When user X signs up, notify others who match ----------

export async function findResidentsToNotify(eventId: string, signerUserId: string): Promise<string[]> {
  await connectDB();

  const event = await Event.findById(eventId).lean();
  if (!event) return [];

  const eventTags = [
    ...(event.tags ?? []),
    ...(event.category ? [event.category] : []),
  ];

  // Find residents who:
  //  - aren't already attending
  //  - aren't the signer themselves
  //  - share tags with the event
  const candidates = await User.find({
    _id: { $nin: [...event.attendees, signerUserId] },
    $or: [
      { derivedTags: { $in: eventTags } },
      { 'interests.label': { $in: eventTags } },
    ],
  })
    .select('_id name fcmTokens derivedTags interests')
    .limit(50)
    .lean();

  // Cheap heuristic ranking — skip LLM for the notification path to save cost.
  // Return user IDs sorted by # of overlapping tags.
  return candidates
    .map((u) => {
      const userTags = new Set([
        ...(u.derivedTags ?? []),
        ...(u.interests ?? []).map((i: Interest) => i.label),
      ]);
      const overlap = eventTags.filter((t) => userTags.has(t)).length;
      return { id: String(u._id), overlap };
    })
    .filter((x) => x.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap)
    .slice(0, 10)
    .map((x) => x.id);
}

// ---------- LLM ranking helper ----------

interface UserLite {
  _id: unknown;
  name: string;
  derivedTags?: string[];
  interests?: Interest[];
}

interface EventLite {
  _id: unknown;
  title: string;
  tags?: string[];
  startAt: Date | string;
}

async function rankWithLLM(
  me: UserLite,
  people: UserLite[],
  events: EventLite[],
): Promise<{ people: MatchSuggestion[]; events: EventSuggestion[] }> {
  if (people.length === 0 && events.length === 0) {
    return { people: [], events: [] };
  }

  const userProfile = {
    name: me.name,
    interests: (me.interests ?? []).map((i) => i.label),
    derivedTags: me.derivedTags ?? [],
  };

  const peopleInput = people.map((p) => ({
    id: String(p._id),
    name: p.name,
    interests: (p.interests ?? []).map((i) => i.label),
    derivedTags: p.derivedTags ?? [],
  }));

  const eventsInput = events.map((e) => ({
    id: String(e._id),
    title: e.title,
    tags: e.tags ?? [],
    startAt: e.startAt,
  }));

  const prompt = `당신은 시니어 입주민 사회화 도우미입니다. 사용자와 잘 맞는 이웃과 이벤트를 추천하세요.
- 공통 관심사가 많을수록 우선
- 이유는 한국어로 한 문장, 친근하게
- JSON으로만 응답

사용자 프로필:
${JSON.stringify(userProfile, null, 2)}

후보 이웃들:
${JSON.stringify(peopleInput, null, 2)}

후보 이벤트들:
${JSON.stringify(eventsInput, null, 2)}

다음 JSON 스키마로 응답:
{
  "people": [{ "userId": "...", "name": "...", "reason": "...", "sharedTags": ["..."] }],
  "events": [{ "eventId": "...", "title": "...", "reason": "..." }]
}
people는 최대 5명, events는 최대 3개.`;

  try {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.4,
    });

    const raw = completion.choices[0]?.message?.content ?? '{}';
    const parsed = JSON.parse(raw);
    return {
      people: Array.isArray(parsed.people) ? parsed.people.slice(0, 5) : [],
      events: Array.isArray(parsed.events) ? parsed.events.slice(0, 3) : [],
    };
  } catch (err) {
    console.error('[match] LLM ranking failed, falling back to heuristic:', err);
    // Fallback: rank by tag overlap, no reason text
    return {
      people: people.slice(0, 5).map((p) => ({
        userId: String(p._id),
        name: p.name,
        reason: '비슷한 관심사를 가진 이웃입니다.',
        sharedTags: [],
      })),
      events: events.slice(0, 3).map((e) => ({
        eventId: String(e._id),
        title: e.title,
        reason: '관심사와 어울리는 행사입니다.',
      })),
    };
  }
}
