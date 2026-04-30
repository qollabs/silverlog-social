'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { InviteeSuggestion } from '@/lib/invite';

export default function InvitePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [suggestions, setSuggestions] = useState<InviteeSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/events/${id}/invite-suggestions`)
      .then((r) => r.json())
      .then((d) => setSuggestions(d.suggestions ?? []))
      .catch(() => setSuggestions([]))
      .finally(() => setLoading(false));
  }, [id]);

  const toggle = (uid: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  };

  const invite = async () => {
    if (selected.size === 0) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/events/${id}/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: Array.from(selected) }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? '초대 전송에 실패했습니다.');
      router.push(`/events/${id}`);
    } catch (e) {
      setError((e as Error).message);
      setSending(false);
    }
  };

  return (
    <div className="px-5 pt-4 pb-32">
      <h1 className="font-display text-3xl mb-1">이웃 초대하기</h1>
      <p className="text-base text-muted mb-6">행사와 잘 맞는 이웃을 AI가 추천했어요.</p>

      {loading ? (
        <div className="text-center text-muted py-16">추천 이웃을 찾는 중...</div>
      ) : suggestions.length === 0 ? (
        <div className="card p-6 text-center space-y-2">
          <p className="text-base text-muted">아직 추천할 이웃이 없어요.</p>
          <p className="text-sm text-muted">이웃들이 행사에 더 참여하면 추천이 정확해집니다.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {suggestions.map((s) => {
            const picked = selected.has(s.userId);
            return (
              <button
                key={s.userId}
                type="button"
                onClick={() => toggle(s.userId)}
                className={`w-full card p-4 text-left transition-colors border-2 ${
                  picked ? 'border-primary bg-primary/5' : 'border-line'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shrink-0 ${
                      picked ? 'bg-primary text-white' : 'bg-primary/10 text-primary'
                    }`}
                  >
                    {picked ? '✓' : s.name.slice(0, 1)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-base mb-0.5">{s.name}</div>
                    <p className="text-sm text-muted leading-snug mb-2">{s.reason}</p>
                    {s.sharedTags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {s.sharedTags.map((t) => (
                          <span key={t} className="chip text-xs">
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 rounded-xl bg-danger/10 text-danger text-base font-medium">
          {error}
        </div>
      )}

      <div className="fixed bottom-20 left-0 right-0 max-w-md mx-auto px-5 pb-2 space-y-2">
        {suggestions.length > 0 && (
          <button
            type="button"
            onClick={invite}
            disabled={selected.size === 0 || sending}
            className="btn-primary w-full disabled:opacity-50"
          >
            {sending ? '초대 중...' : selected.size > 0 ? `${selected.size}명 초대하기` : '이웃을 선택해주세요'}
          </button>
        )}
        <Link href={`/events/${id}`} className="btn-secondary w-full text-center block">
          건너뛰기
        </Link>
      </div>
    </div>
  );
}
