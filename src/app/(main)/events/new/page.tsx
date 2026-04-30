'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { InterestCategory } from '@/types';

const CATEGORIES: { value: InterestCategory; label: string; emoji: string }[] = [
  { value: 'physical', label: '운동', emoji: '🚶' },
  { value: 'hobby', label: '취미', emoji: '🎨' },
  { value: 'religion', label: '종교', emoji: '🙏' },
  { value: 'food', label: '음식', emoji: '🍵' },
  { value: 'social', label: '모임', emoji: '🤝' },
];

const SUGGESTED_TAGS = ['초보환영', '여성', '남성', '소규모', '정기모임', '친목', '실내', '실외'];

export default function NewEventPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState('');     // yyyy-mm-dd
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('11:00');
  const [maxAttendees, setMaxAttendees] = useState('10');
  const [category, setCategory] = useState<InterestCategory>('social');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleTag = (t: string) => {
    setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  };

  const addCustomTag = () => {
    const v = tagInput.trim();
    if (!v || tags.includes(v) || tags.length >= 15) return;
    setTags([...tags, v]);
    setTagInput('');
  };

  const submit = async () => {
    setError(null);
    if (title.trim().length < 2) return setError('행사 이름을 입력해 주세요.');
    if (!location.trim()) return setError('장소를 입력해 주세요.');
    if (!date || !startTime || !endTime) return setError('날짜와 시간을 입력해 주세요.');
    const max = parseInt(maxAttendees, 10);
    if (isNaN(max) || max < 1) return setError('정원을 올바르게 입력해 주세요.');

    // Build KST datetime then convert to UTC ISO
    const startAt = new Date(`${date}T${startTime}:00+09:00`).toISOString();
    const endAt = new Date(`${date}T${endTime}:00+09:00`).toISOString();
    if (new Date(endAt) <= new Date(startAt)) {
      return setError('종료 시간은 시작 시간 이후여야 합니다.');
    }
    if (new Date(startAt) < new Date()) {
      return setError('과거 시간으로는 행사를 만들 수 없습니다.');
    }

    setLoading(true);
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          location: location.trim(),
          startAt,
          endAt,
          maxAttendees: max,
          tags,
          category,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? '저장에 실패했습니다.');
      router.push(`/events/${json.event._id}/invite`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-5 pt-4 pb-8">
      <button onClick={() => router.back()} className="btn-ghost text-base px-3 py-2 -ml-3 mb-3">
        ← 뒤로
      </button>
      <h1 className="font-display text-3xl mb-6">행사 만들기</h1>

      <div className="space-y-5">
        <Field label="행사 이름" required>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: 월요일 아침 산책 모임"
            className="input"
            maxLength={100}
          />
        </Field>

        <Field label="설명">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="행사 내용을 자유롭게 적어주세요."
            className="input min-h-[120px] resize-y"
            maxLength={2000}
          />
        </Field>

        <Field label="장소" required>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="예: 1층 다목적 홀"
            className="input"
            maxLength={100}
          />
        </Field>

        <Field label="날짜" required>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="input"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="시작 시간" required>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="input"
            />
          </Field>
          <Field label="종료 시간" required>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="input"
            />
          </Field>
        </div>

        <Field label="정원" required>
          <input
            type="number"
            inputMode="numeric"
            value={maxAttendees}
            onChange={(e) => setMaxAttendees(e.target.value)}
            min={1}
            max={500}
            className="input"
          />
        </Field>

        <Field label="분류">
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                onClick={() => setCategory(c.value)}
                className={`min-h-[48px] px-4 py-2 rounded-full text-base font-medium border-2 transition-colors ${
                  category === c.value
                    ? 'bg-primary text-primary-ink border-primary'
                    : 'bg-white text-ink border-line'
                }`}
              >
                <span className="mr-1">{c.emoji}</span>
                {c.label}
              </button>
            ))}
          </div>
        </Field>

        <Field label="태그" hint="추천: 비슷한 관심사를 가진 이웃에게 알려드립니다.">
          <div className="flex flex-wrap gap-2 mb-3">
            {SUGGESTED_TAGS.map((t) => (
              <button
                key={t}
                onClick={() => toggleTag(t)}
                className={`min-h-[44px] px-3 py-1.5 rounded-full text-sm font-medium border-2 transition-colors ${
                  tags.includes(t)
                    ? 'bg-accent text-accent-ink border-accent'
                    : 'bg-white text-muted border-line'
                }`}
              >
                #{t}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomTag())}
              placeholder="직접 입력"
              className="input flex-1"
              maxLength={20}
            />
            <button onClick={addCustomTag} className="btn-secondary px-5">추가</button>
          </div>
          {tags.filter((t) => !SUGGESTED_TAGS.includes(t)).length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {tags
                .filter((t) => !SUGGESTED_TAGS.includes(t))
                .map((t) => (
                  <button
                    key={t}
                    onClick={() => toggleTag(t)}
                    className="min-h-[40px] px-3 py-1 rounded-full text-sm font-medium bg-accent/10 text-accent border-2 border-accent/30"
                  >
                    #{t} ✕
                  </button>
                ))}
            </div>
          )}
        </Field>

        {error && (
          <div className="p-4 rounded-xl bg-danger/10 text-danger text-base font-medium">
            {error}
          </div>
        )}

        <button onClick={submit} disabled={loading} className="btn-primary w-full disabled:opacity-50 mt-4">
          {loading ? '저장 중...' : '행사 만들기'}
        </button>
      </div>
    </div>
  );
}

function Field({
  label, required, hint, children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-base font-semibold mb-2 text-ink">
        {label}
        {required && <span className="ml-1 text-accent">*</span>}
      </label>
      {children}
      {hint && <p className="text-sm text-muted mt-2">{hint}</p>}
    </div>
  );
}
