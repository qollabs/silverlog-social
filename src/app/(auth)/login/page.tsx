'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Step = 'phone' | 'code';

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('phone');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);

  const requestOtp = async () => {
    setError(null);
    if (name.trim().length < 2) return setError('이름을 입력해 주세요.');
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (!/^01[016789]\d{7,8}$/.test(cleanPhone)) {
      return setError('올바른 휴대폰 번호를 입력해 주세요.');
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? '인증번호 전송에 실패했습니다.');

      setStep('code');
      setSecondsLeft(json.expiresIn ?? 180);
      const t = setInterval(() => {
        setSecondsLeft((s) => {
          if (s <= 1) { clearInterval(t); return 0; }
          return s - 1;
        });
      }, 1000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    setError(null);
    if (!/^\d{6}$/.test(code)) return setError('6자리 인증번호를 입력해 주세요.');
    const cleanPhone = phone.replace(/[^0-9]/g, '');

    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone, name: name.trim(), code }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? '인증에 실패했습니다.');

      router.push(json.needsOnboarding ? '/onboarding' : '/events');
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex-1 flex flex-col justify-center pt-12">
        <div className="mb-12">
          <h1 className="font-display text-4xl text-primary mb-3">실버로그</h1>
          <p className="text-lg text-muted leading-relaxed">
            우리 단지 이웃과<br />
            함께하는 즐거운 만남
          </p>
        </div>

        {step === 'phone' && (
          <div className="space-y-5">
            <div>
              <label className="block text-base font-semibold mb-2 text-ink">
                성함
              </label>
              <input
                type="text"
                inputMode="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="홍길동"
                className="input"
                maxLength={20}
              />
            </div>
            <div>
              <label className="block text-base font-semibold mb-2 text-ink">
                휴대폰 번호
              </label>
              <input
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="010-1234-5678"
                className="input"
                maxLength={13}
              />
              <p className="text-sm text-muted mt-2">
                인증번호를 문자로 보내드립니다.
              </p>
            </div>

            {error && (
              <div className="p-4 rounded-xl bg-danger/10 text-danger text-base font-medium">
                {error}
              </div>
            )}

            <button
              onClick={requestOtp}
              disabled={loading}
              className="btn-primary w-full disabled:opacity-50"
            >
              {loading ? '전송 중...' : '인증번호 받기'}
            </button>
          </div>
        )}

        {step === 'code' && (
          <div className="space-y-5">
            <div>
              <label className="block text-base font-semibold mb-2 text-ink">
                인증번호 6자리
              </label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="000000"
                className="input text-center text-2xl tracking-[0.5em]"
                maxLength={6}
              />
              {secondsLeft > 0 ? (
                <p className="text-sm text-muted mt-2">
                  남은 시간: {Math.floor(secondsLeft / 60)}분 {secondsLeft % 60}초
                </p>
              ) : (
                <p className="text-sm text-danger mt-2">
                  인증번호가 만료되었습니다. 다시 요청해 주세요.
                </p>
              )}
            </div>

            {error && (
              <div className="p-4 rounded-xl bg-danger/10 text-danger text-base font-medium">
                {error}
              </div>
            )}

            <button
              onClick={verifyOtp}
              disabled={loading || secondsLeft === 0}
              className="btn-primary w-full disabled:opacity-50"
            >
              {loading ? '확인 중...' : '확인'}
            </button>
            <button
              onClick={() => { setStep('phone'); setCode(''); setError(null); }}
              className="btn-ghost w-full"
            >
              번호 다시 입력
            </button>
          </div>
        )}
      </div>

      <p className="text-sm text-muted text-center pb-4">
        © {new Date().getFullYear()} QoL LABS
      </p>
    </>
  );
}
