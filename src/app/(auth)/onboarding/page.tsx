'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { InterestCategory } from '@/types';

interface InterestOption {
  category: InterestCategory;
  label: string;
}

const INTEREST_OPTIONS: { category: InterestCategory; title: string; emoji: string; items: string[] }[] = [
  {
    category: 'physical',
    title: '운동·신체활동',
    emoji: '🚶',
    items: ['요가', '체조', '산책', '등산', '게이트볼', '탁구', '수영', '골프', '걷기'],
  },
  {
    category: 'hobby',
    title: '취미·여가',
    emoji: '🎨',
    items: ['바둑', '장기', '서예', '그림', '독서', '음악감상', '노래', '댄스', '사진'],
  },
  {
    category: 'religion',
    title: '종교',
    emoji: '🙏',
    items: ['기독교', '천주교', '불교', '원불교', '없음'],
  },
  {
    category: 'food',
    title: '음식·미식',
    emoji: '🍵',
    items: ['전통차', '한식', '커피', '베이킹', '반찬만들기'],
  },
  {
    category: 'social',
    title: '모임 성향',
    emoji: '🤝',
    items: ['소규모 모임', '대화 위주', '활동 위주', '봉사활동'],
  },
];

const ALLERGY_OPTIONS = ['땅콩', '견과류', '계란', '우유', '갑각류', '생선', '메밀', '복숭아'];

const TIME_SLOTS = [
  { value: 'morning', label: '오전 (6시 ~ 12시)' },
  { value: 'afternoon', label: '오후 (12시 ~ 17시)' },
  { value: 'evening', label: '저녁 (17시 ~ 20시)' },
];

type Step = 'welcome' | 'interests' | 'allergies' | 'time' | 'done';

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('welcome');
  const [interests, setInterests] = useState<InterestOption[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const toggleInterest = (category: InterestCategory, label: string) => {
    setInterests((prev) => {
      const exists = prev.some((i) => i.category === category && i.label === label);
      if (exists) return prev.filter((i) => !(i.category === category && i.label === label));
      return [...prev, { category, label }];
    });
  };

  const toggleAllergy = (label: string) =>
    setAllergies((prev) => (prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]));

  const toggleTime = (value: string) =>
    setTimeSlots((prev) => (prev.includes(value) ? prev.filter((t) => t !== value) : [...prev, value]));

  const submit = async () => {
    setLoading(true);
    try {
      await fetch('/api/me/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interests,
          allergies: allergies.map((label) => ({ label })),
          preferredTimeSlots: timeSlots,
        }),
      });
      setStep('done');
      setTimeout(() => {
        router.push('/events');
        router.refresh();
      }, 1500);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress dots */}
      {step !== 'welcome' && step !== 'done' && (
        <div className="flex justify-center gap-2 pt-2">
          {['interests', 'allergies', 'time'].map((s) => (
            <div
              key={s}
              className={`h-2 rounded-full transition-all ${
                step === s ? 'w-8 bg-primary' : 'w-2 bg-line'
              }`}
            />
          ))}
        </div>
      )}

      {step === 'welcome' && (
        <div className="text-center pt-12 space-y-6">
          <div className="text-6xl">👋</div>
          <h1 className="font-display text-3xl text-ink">환영합니다!</h1>
          <p className="text-lg text-muted leading-relaxed">
            관심사를 알려주시면<br />
            취향이 맞는 이웃과<br />
            행사를 추천해 드립니다.
          </p>
          <p className="text-sm text-muted">
            (3가지 간단한 질문, 1분 정도 걸려요)
          </p>
          <button onClick={() => setStep('interests')} className="btn-primary w-full mt-8">
            시작하기
          </button>
        </div>
      )}

      {step === 'interests' && (
        <div className="space-y-6">
          <div>
            <h2 className="h-display mb-2">어떤 활동을 좋아하세요?</h2>
            <p className="text-base text-muted">관심 있는 항목을 모두 선택해 주세요.</p>
          </div>
          <div className="space-y-5">
            {INTEREST_OPTIONS.map((group) => (
              <section key={group.category}>
                <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                  <span className="text-2xl">{group.emoji}</span>
                  {group.title}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {group.items.map((item) => {
                    const selected = interests.some(
                      (i) => i.category === group.category && i.label === item,
                    );
                    return (
                      <button
                        key={item}
                        onClick={() => toggleInterest(group.category, item)}
                        className={`min-h-[48px] px-4 py-2 rounded-full text-base font-medium border-2 transition-colors ${
                          selected
                            ? 'bg-primary text-primary-ink border-primary'
                            : 'bg-white text-ink border-line'
                        }`}
                      >
                        {item}
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
          <div className="flex gap-3 sticky bottom-4 bg-bg/95 pt-4">
            <button onClick={() => setStep('allergies')} className="btn-ghost flex-1">
              건너뛰기
            </button>
            <button onClick={() => setStep('allergies')} className="btn-primary flex-1">
              다음
            </button>
          </div>
        </div>
      )}

      {step === 'allergies' && (
        <div className="space-y-6">
          <div>
            <h2 className="h-display mb-2">알레르기가 있으세요?</h2>
            <p className="text-base text-muted">
              음식 행사에서 안전하게 모실 수 있도록 알려 주세요.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {ALLERGY_OPTIONS.map((item) => {
              const selected = allergies.includes(item);
              return (
                <button
                  key={item}
                  onClick={() => toggleAllergy(item)}
                  className={`min-h-[48px] px-4 py-2 rounded-full text-base font-medium border-2 transition-colors ${
                    selected
                      ? 'bg-accent text-accent-ink border-accent'
                      : 'bg-white text-ink border-line'
                  }`}
                >
                  {item}
                </button>
              );
            })}
          </div>
          <div className="flex gap-3 sticky bottom-4 bg-bg/95 pt-4">
            <button onClick={() => setStep('time')} className="btn-ghost flex-1">
              건너뛰기
            </button>
            <button onClick={() => setStep('time')} className="btn-primary flex-1">
              다음
            </button>
          </div>
        </div>
      )}

      {step === 'time' && (
        <div className="space-y-6">
          <div>
            <h2 className="h-display mb-2">언제 활동하기 좋으세요?</h2>
            <p className="text-base text-muted">선호하시는 시간대를 모두 선택해 주세요.</p>
          </div>
          <div className="space-y-3">
            {TIME_SLOTS.map((slot) => {
              const selected = timeSlots.includes(slot.value);
              return (
                <button
                  key={slot.value}
                  onClick={() => toggleTime(slot.value)}
                  className={`w-full min-h-touch px-5 py-4 rounded-2xl text-lg font-semibold text-left border-2 transition-colors ${
                    selected
                      ? 'bg-primary text-primary-ink border-primary'
                      : 'bg-white text-ink border-line'
                  }`}
                >
                  <span className="mr-2">{selected ? '✓' : '○'}</span>
                  {slot.label}
                </button>
              );
            })}
          </div>
          <div className="flex gap-3 sticky bottom-4 bg-bg/95 pt-4">
            <button onClick={submit} disabled={loading} className="btn-primary flex-1 disabled:opacity-50">
              {loading ? '저장 중...' : '완료'}
            </button>
          </div>
        </div>
      )}

      {step === 'done' && (
        <div className="text-center pt-20 space-y-4">
          <div className="text-6xl">🎉</div>
          <h2 className="h-display">준비가 되었습니다!</h2>
          <p className="text-base text-muted">잠시만 기다려 주세요...</p>
        </div>
      )}
    </div>
  );
}
