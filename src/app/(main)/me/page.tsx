'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Interest, Allergy } from '@/types';
import { fmtDateTime } from '@/lib/format';

interface Me {
  _id: string;
  name: string;
  phone: string;
  interests: Interest[];
  allergies: Allergy[];
  preferredTimeSlots: string[];
  derivedTags: string[];
  createdAt: string;
}

interface PendingInvitation {
  _id: string;
  event: { _id: string; title: string; location: string; startAt: string };
  fromUser: { name: string };
  createdAt: string;
}

const TIME_LABELS: Record<string, string> = {
  morning: '오전',
  afternoon: '오후',
  evening: '저녁',
};

export default function MePage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
  const [responding, setResponding] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/me')
      .then((r) => r.json())
      .then((d) => setMe(d.user))
      .finally(() => setLoading(false));

    fetch('/api/me/invitations')
      .then((r) => r.json())
      .then((d) => setInvitations(d.invitations ?? []));
  }, []);

  const respond = async (invId: string, status: 'accepted' | 'declined') => {
    setResponding(invId);
    try {
      const res = await fetch(`/api/me/invitations/${invId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setInvitations((prev) => prev.filter((i) => i._id !== invId));
      }
    } finally {
      setResponding(null);
    }
  };

  const logout = async () => {
    if (!confirm('로그아웃 하시겠습니까?')) return;
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  if (loading || !me) {
    return <div className="text-center text-muted py-20">불러오는 중...</div>;
  }

  return (
    <div className="px-5 pt-6 pb-4 space-y-5">
      <h1 className="font-display text-3xl mb-2">내 정보</h1>

      {/* Invitation inbox — shown at top when there are pending invites */}
      {invitations.length > 0 && (
        <section className="card p-5 border-2 border-accent/30">
          <h3 className="text-base font-bold mb-3 text-accent">
            초대 {invitations.length}건
          </h3>
          <div className="space-y-4">
            {invitations.map((inv) => (
              <div key={inv._id} className="space-y-3">
                <div>
                  <Link
                    href={`/events/${inv.event._id}`}
                    className="font-semibold text-base text-primary underline-offset-2 hover:underline"
                  >
                    {inv.event.title}
                  </Link>
                  <p className="text-sm text-muted mt-0.5">
                    {inv.fromUser.name}님의 초대 · {fmtDateTime(inv.event.startAt)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => respond(inv._id, 'accepted')}
                    disabled={responding === inv._id}
                    className="btn-primary flex-1 py-2 text-base disabled:opacity-50"
                  >
                    수락
                  </button>
                  <button
                    type="button"
                    onClick={() => respond(inv._id, 'declined')}
                    disabled={responding === inv._id}
                    className="btn-secondary flex-1 py-2 text-base disabled:opacity-50"
                  >
                    거절
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Profile card */}
      <div className="card p-6 text-center">
        <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 text-primary flex items-center justify-center text-3xl font-bold mb-3">
          {me.name.slice(0, 1)}
        </div>
        <h2 className="text-2xl font-bold mb-1">{me.name}</h2>
        <p className="text-base text-muted">{formatPhone(me.phone)}</p>
      </div>

      {/* Interests */}
      <Section title="관심사">
        {me.interests.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {me.interests.map((i, idx) => (
              <span key={idx} className="chip-primary">{i.label}</span>
            ))}
          </div>
        ) : (
          <p className="text-base text-muted">아직 등록된 관심사가 없습니다.</p>
        )}
      </Section>

      {/* Allergies */}
      <Section title="알레르기">
        {me.allergies.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {me.allergies.map((a, idx) => (
              <span key={idx} className="chip-accent">⚠️ {a.label}</span>
            ))}
          </div>
        ) : (
          <p className="text-base text-muted">없음</p>
        )}
      </Section>

      {/* Time slots */}
      <Section title="선호 시간대">
        {me.preferredTimeSlots.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {me.preferredTimeSlots.map((t) => (
              <span key={t} className="chip">{TIME_LABELS[t] ?? t}</span>
            ))}
          </div>
        ) : (
          <p className="text-base text-muted">미설정</p>
        )}
      </Section>

      {/* Derived tags — only show if some exist */}
      {me.derivedTags.length > 0 && (
        <Section title="활동 이력 태그" hint="참여하신 행사를 바탕으로 자동 수집됩니다.">
          <div className="flex flex-wrap gap-1.5">
            {me.derivedTags.slice(0, 20).map((t) => (
              <span key={t} className="chip">#{t}</span>
            ))}
          </div>
        </Section>
      )}

      <button type="button" onClick={logout} className="btn-secondary w-full mt-6">
        로그아웃
      </button>
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="card p-5">
      <h3 className="text-base font-bold mb-3 text-muted">{title}</h3>
      {children}
      {hint && <p className="text-sm text-muted mt-3">{hint}</p>}
    </section>
  );
}

function formatPhone(p: string): string {
  if (p.length === 11) return `${p.slice(0, 3)}-${p.slice(3, 7)}-${p.slice(7)}`;
  if (p.length === 10) return `${p.slice(0, 3)}-${p.slice(3, 6)}-${p.slice(6)}`;
  return p;
}
