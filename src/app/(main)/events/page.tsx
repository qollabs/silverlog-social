'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { EventCard } from '@/components/EventCard';
import type { EventDoc, EventListBucket } from '@/types';

const TABS: { value: EventListBucket; label: string }[] = [
  { value: 'open', label: '신청가능' },
  { value: 'closed', label: '마감' },
  { value: 'past', label: '지난행사' },
];

export default function EventsPage() {
  const [bucket, setBucket] = useState<EventListBucket>('open');
  const [events, setEvents] = useState<EventDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/events?bucket=${bucket}`)
      .then((r) => r.json())
      .then((d) => setEvents(d.events ?? []))
      .finally(() => setLoading(false));
  }, [bucket]);

  return (
    <div className="px-5 pt-6 pb-4">
      <header className="flex items-center justify-between mb-5">
        <h1 className="font-display text-3xl">행사</h1>
        <Link href="/events/new" className="btn-primary text-base px-5 py-3 min-h-0">
          + 만들기
        </Link>
      </header>

      {/* Tabs */}
      <div className="flex gap-2 mb-5 sticky top-0 bg-bg/95 backdrop-blur py-2 -mx-5 px-5 z-10">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setBucket(t.value)}
            className={`flex-1 min-h-touch px-4 py-3 rounded-2xl text-base font-semibold transition-colors ${
              bucket === t.value
                ? 'bg-primary text-primary-ink'
                : 'bg-white text-muted border-2 border-line'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center text-muted py-16">불러오는 중...</div>
      ) : events.length === 0 ? (
        <EmptyState bucket={bucket} />
      ) : (
        <div className="space-y-3">
          {events.map((e) => (
            <EventCard key={e._id} event={e} />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState({ bucket }: { bucket: EventListBucket }) {
  const messages: Record<EventListBucket, { emoji: string; title: string; sub: string }> = {
    open: {
      emoji: '🌱',
      title: '아직 행사가 없어요',
      sub: '첫 번째 행사를 만들어 보세요.',
    },
    closed: {
      emoji: '✋',
      title: '마감된 행사가 없습니다',
      sub: '신청 가능한 행사를 확인해 보세요.',
    },
    past: {
      emoji: '📚',
      title: '지난 행사가 없습니다',
      sub: '',
    },
  };
  const m = messages[bucket];
  return (
    <div className="text-center py-16 px-6">
      <div className="text-5xl mb-4">{m.emoji}</div>
      <h3 className="text-xl font-bold mb-2">{m.title}</h3>
      <p className="text-base text-muted">{m.sub}</p>
      {bucket === 'open' && (
        <Link href="/events/new" className="btn-primary inline-flex mt-6">
          행사 만들기
        </Link>
      )}
    </div>
  );
}
