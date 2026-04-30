'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { EventCard } from '@/components/EventCard';
import type { EventDoc } from '@/types';

export default function MyEventsPage() {
  const [events, setEvents] = useState<EventDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/me/events')
      .then((r) => r.json())
      .then((d) => setEvents(d.events ?? []))
      .finally(() => setLoading(false));
  }, []);

  const upcoming = events.filter((e) => !e.isPast);
  const past = events.filter((e) => e.isPast);

  return (
    <div className="px-5 pt-6 pb-4">
      <h1 className="font-display text-3xl mb-5">내 일정</h1>

      {loading ? (
        <div className="text-center text-muted py-16">불러오는 중...</div>
      ) : events.length === 0 ? (
        <div className="text-center py-16 px-6">
          <div className="text-5xl mb-4">📭</div>
          <h3 className="text-xl font-bold mb-2">아직 신청한 행사가 없어요</h3>
          <p className="text-base text-muted mb-6">관심 있는 행사에 신청해 보세요.</p>
          <Link href="/events" className="btn-primary inline-flex">행사 둘러보기</Link>
        </div>
      ) : (
        <div className="space-y-6">
          {upcoming.length > 0 && (
            <section>
              <h2 className="h-section mb-3">다가오는 일정 ({upcoming.length})</h2>
              <div className="space-y-3">
                {upcoming.map((e) => (
                  <EventCard key={e._id} event={e} showStatus={false} />
                ))}
              </div>
            </section>
          )}
          {past.length > 0 && (
            <section>
              <h2 className="h-section mb-3 text-muted">지난 일정 ({past.length})</h2>
              <div className="space-y-3 opacity-70">
                {past.map((e) => (
                  <EventCard key={e._id} event={e} showStatus={false} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
