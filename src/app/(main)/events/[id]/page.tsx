'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { fmtDateTime, fmtTimeRange } from '@/lib/format';

interface EventDetail {
  _id: string;
  title: string;
  description?: string;
  location: string;
  startAt: string;
  endAt: string;
  maxAttendees: number;
  attendeeCount: number;
  isFull: boolean;
  isPast: boolean;
  isAttending: boolean;
  tags: string[];
  category?: string;
  createdBy: string;
  attendees: Array<{ _id: string; name: string; interests: { label: string }[] }>;
}

export default function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    fetch(`/api/events/${id}`)
      .then((r) => r.json())
      .then((d) => setEvent(d.event))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const signUp = async () => {
    setActing(true);
    setError(null);
    try {
      const res = await fetch(`/api/events/${id}/signup`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? '신청에 실패했습니다.');
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setActing(false);
    }
  };

  const cancelSignup = async () => {
    if (!confirm('신청을 취소하시겠습니까?')) return;
    setActing(true);
    setError(null);
    try {
      const res = await fetch(`/api/events/${id}/signup`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? '취소에 실패했습니다.');
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setActing(false);
    }
  };

  if (loading) {
    return <div className="text-center text-muted py-20">불러오는 중...</div>;
  }
  if (!event) {
    return (
      <div className="text-center py-20">
        <p className="text-lg text-muted mb-4">행사를 찾을 수 없습니다.</p>
        <Link href="/events" className="btn-secondary inline-flex">목록으로</Link>
      </div>
    );
  }

  return (
    <div className="px-5 pt-4 pb-32">
      <button onClick={() => router.back()} className="btn-ghost text-base px-3 py-2 -ml-3 mb-3">
        ← 뒤로
      </button>

      <div className="card p-6 space-y-5">
        {event.category && (
          <span className="chip-primary inline-block">{categoryLabel(event.category)}</span>
        )}

        <h1 className="font-display text-3xl leading-tight">{event.title}</h1>

        <div className="space-y-3 text-base">
          <Row icon="🗓️" label="일시" value={fmtTimeRange(event.startAt, event.endAt)} />
          <Row icon="📍" label="장소" value={event.location} />
          <Row
            icon="👥"
            label="참여자"
            value={`${event.attendeeCount} / ${event.maxAttendees}명`}
            extra={event.isFull ? <span className="ml-2 text-accent font-semibold">정원마감</span> : null}
          />
        </div>

        {event.description && (
          <div className="pt-3 border-t border-line">
            <h3 className="text-base font-bold mb-2 text-muted">소개</h3>
            <p className="text-base leading-relaxed whitespace-pre-wrap">{event.description}</p>
          </div>
        )}

        {event.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {event.tags.map((t) => (
              <span key={t} className="chip">#{t}</span>
            ))}
          </div>
        )}
      </div>

      {event.attendees.length > 0 && (
        <section className="mt-5">
          <h2 className="h-section mb-3">참여하는 이웃</h2>
          <div className="card p-4 space-y-3">
            {event.attendees.map((a) => (
              <div key={a._id} className="flex items-start gap-3 py-2">
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center text-lg font-bold shrink-0">
                  {a.name.slice(0, 1)}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-base">{a.name}</div>
                  {a.interests?.length > 0 && (
                    <div className="text-sm text-muted">
                      {a.interests.slice(0, 3).map((i) => i.label).join(' · ')}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Sticky action bar */}
      <div className="fixed bottom-20 left-0 right-0 max-w-md mx-auto px-5 pb-2">
        {error && (
          <div className="mb-3 p-3 rounded-xl bg-danger/10 text-danger text-sm font-medium text-center">
            {error}
          </div>
        )}
        {event.isPast ? (
          <button disabled className="btn-secondary w-full opacity-60">종료된 행사</button>
        ) : event.isAttending ? (
          <button onClick={cancelSignup} disabled={acting} className="btn-secondary w-full">
            {acting ? '취소 중...' : '신청 취소'}
          </button>
        ) : event.isFull ? (
          <button disabled className="btn-secondary w-full opacity-60">정원이 마감되었습니다</button>
        ) : (
          <button onClick={signUp} disabled={acting} className="btn-primary w-full">
            {acting ? '신청 중...' : '신청하기'}
          </button>
        )}
      </div>
    </div>
  );
}

function Row({ icon, label, value, extra }: { icon: string; label: string; value: string; extra?: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="text-xl shrink-0" aria-hidden>{icon}</span>
      <div className="flex-1">
        <div className="text-sm text-muted">{label}</div>
        <div className="text-lg font-medium">
          {value}
          {extra}
        </div>
      </div>
    </div>
  );
}

function categoryLabel(c: string): string {
  return ({ physical: '운동', religion: '종교', hobby: '취미', food: '음식', social: '모임' } as Record<string, string>)[c] ?? c;
}
