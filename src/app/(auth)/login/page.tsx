'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { postToFlutter } from '@/lib/flutter-bridge';
import { useLocale } from '@/context/LocaleContext';

type Step = 'phone' | 'code';

export default function LoginPage() {
  const router = useRouter();
  const { t, locale } = useLocale();
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
    const raw = phone.trim();
    const cleanPhone = raw.startsWith('+')
      ? '+' + raw.replace(/[^0-9]/g, '')
      : raw.replace(/[^0-9]/g, '');
    if (!/^(\+[1-9]\d{7,14}|01[016789]\d{7,8})$/.test(cleanPhone)) {
      return setError('올바른 휴대폰 번호를 입력해 주세요. (예: 01012345678 또는 +12025551234)');
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
      const timer = setInterval(() => {
        setSecondsLeft((s) => {
          if (s <= 1) { clearInterval(timer); return 0; }
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
    const raw = phone.trim();
    const cleanPhone = raw.startsWith('+')
      ? '+' + raw.replace(/[^0-9]/g, '')
      : raw.replace(/[^0-9]/g, '');

    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone, name: name.trim(), code }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? '인증에 실패했습니다.');

      postToFlutter({ type: 'login_complete', userId: json.user?._id });
      router.push(json.needsOnboarding ? '/onboarding' : '/events');
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const timeLabel = locale === 'ko'
    ? `남은 시간: ${Math.floor(secondsLeft / 60)}분 ${secondsLeft % 60}초`
    : `Time left: ${Math.floor(secondsLeft / 60)}m ${secondsLeft % 60}s`;

  return (
    <>
      <div className="flex-1 flex flex-col justify-center pt-12">
        <div className="mb-12">
          <h1 className="font-display text-4xl text-primary mb-3">{t('login_title')}</h1>
          <p className="text-lg text-muted leading-relaxed whitespace-pre-line">
            {t('login_subtitle')}
          </p>
        </div>

        {step === 'phone' && (
          <div className="space-y-5">
            <div>
              <label className="block text-base font-semibold mb-2 text-ink">
                {t('login_name_label')}
              </label>
              <input
                type="text"
                inputMode="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('login_name_placeholder')}
                className="input"
                maxLength={20}
              />
            </div>
            <div>
              <label className="block text-base font-semibold mb-2 text-ink">
                {t('login_phone_label')}
              </label>
              <input
                type="tel"
                inputMode="text"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="010-1234-5678 또는 +12025551234"
                className="input"
                maxLength={16}
              />
              <p className="text-sm text-muted mt-2">{t('login_phone_hint')}</p>
            </div>

            {error && (
              <div className="p-4 rounded-xl bg-danger/10 text-danger text-base font-medium">
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={requestOtp}
              disabled={loading}
              className="btn-primary w-full disabled:opacity-50"
            >
              {loading ? t('login_requesting') : t('login_request_otp')}
            </button>
          </div>
        )}

        {step === 'code' && (
          <div className="space-y-5">
            <div>
              <label className="block text-base font-semibold mb-2 text-ink">
                {t('login_otp_label')}
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
                <p className="text-sm text-muted mt-2">{timeLabel}</p>
              ) : (
                <p className="text-sm text-danger mt-2">{t('login_otp_expired')}</p>
              )}
            </div>

            {error && (
              <div className="p-4 rounded-xl bg-danger/10 text-danger text-base font-medium">
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={verifyOtp}
              disabled={loading || secondsLeft === 0}
              className="btn-primary w-full disabled:opacity-50"
            >
              {loading ? t('login_verifying') : t('login_verify')}
            </button>
            <button
              type="button"
              onClick={() => { setStep('phone'); setCode(''); setError(null); }}
              className="btn-ghost w-full"
            >
              {t('login_back')}
            </button>
          </div>
        )}
      </div>

      <p className="text-sm text-muted text-center pb-4">{t('login_footer')}</p>
    </>
  );
}
