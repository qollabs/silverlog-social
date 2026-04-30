'use client';

import { useEffect, useState } from 'react';
import type { Interest } from '@/types';

interface Resident {
  _id: string;
  name: string;
  interests: Interest[];
  derivedTags: string[];
  joinedAt: string;
}

export default function ResidentsPage() {
  const [residents, setResidents] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/residents')
      .then((r) => r.json())
      .then((d) => setResidents(d.residents ?? []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = search
    ? residents.filter((r) =>
        r.name.includes(search) ||
        r.interests.some((i) => i.label.includes(search)),
      )
    : residents;

  return (
    <div className="px-5 pt-6 pb-4">
      <h1 className="font-display text-3xl mb-5">우리 이웃</h1>

      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="이름이나 관심사로 찾기"
        className="input mb-5"
      />

      {loading ? (
        <div className="text-center text-muted py-16">불러오는 중...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-base text-muted">
            {search ? '검색 결과가 없습니다.' : '아직 등록된 이웃이 없습니다.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <article key={r._id} className="card p-4">
              <div className="flex items-start gap-3">
                <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xl font-bold shrink-0">
                  {r.name.slice(0, 1)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold mb-1">{r.name}</h3>
                  {r.interests.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {r.interests.slice(0, 6).map((i, idx) => (
                        <span key={idx} className="chip">{i.label}</span>
                      ))}
                      {r.interests.length > 6 && (
                        <span className="chip text-muted">+{r.interests.length - 6}</span>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted">관심사 미등록</p>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
