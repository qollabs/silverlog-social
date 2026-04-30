import type { EventDocument } from '@/models/Event';

/**
 * Derives tags from an event that should be added to a user's profile
 * when they sign up. These accumulated tags are what the AI matcher uses
 * to find compatible residents.
 *
 * Examples of derived tags:
 *  - From title "월요일 아침 요가 모임" → ["요가", "오전", "월요일"]
 *  - From category "physical" → ["physical"]
 *  - From explicit tags → as-is
 *  - From time → time bucket ("morning"/"afternoon"/"evening")
 *  - From day of week → "월요일" etc.
 */
export function deriveTagsFromEvent(event: Pick<EventDocument, 'title' | 'tags' | 'category' | 'startAt'>): string[] {
  const tags = new Set<string>();

  // Explicit event tags
  for (const t of event.tags ?? []) tags.add(t.trim());

  // Category
  if (event.category) tags.add(event.category);

  // Time bucket (KST)
  const kstHour = getKstHour(event.startAt);
  if (kstHour < 12) tags.add('오전');
  else if (kstHour < 17) tags.add('오후');
  else tags.add('저녁');

  // Day of week (KST)
  tags.add(getKstDayKor(event.startAt));

  // Naive keyword extraction from title — drops particles
  for (const kw of extractKeywords(event.title)) tags.add(kw);

  return Array.from(tags).filter(Boolean);
}

const KOREAN_PARTICLES = /(은|는|이|가|을|를|의|에|에서|로|으로|와|과|도|만|조차|마저)$/;
const STOP_WORDS = new Set(['모임', '행사', '이벤트', '시간', '활동']);

function extractKeywords(title: string): string[] {
  return title
    .split(/\s+/)
    .map((w) => w.replace(KOREAN_PARTICLES, ''))
    .filter((w) => w.length >= 2 && !STOP_WORDS.has(w));
}

function getKstHour(date: Date | string): number {
  const d = new Date(date);
  // KST = UTC+9
  return (d.getUTCHours() + 9) % 24;
}

function getKstDayKor(date: Date | string): string {
  const d = new Date(date);
  // Adjust for KST
  const kstMs = d.getTime() + 9 * 60 * 60 * 1000;
  const kstDate = new Date(kstMs);
  const days = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
  return days[kstDate.getUTCDay()];
}
