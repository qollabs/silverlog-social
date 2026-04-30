import type { Metadata, Viewport } from 'next';
import './globals.css';
import { LocaleProvider } from '@/context/LocaleContext';
import { LangToggle } from '@/components/LangToggle';

export const metadata: Metadata = {
  title: '실버로그 — 함께하는 우리 이웃',
  description: '시니어 입주민을 위한 소셜 행사 플랫폼',
  applicationName: '실버로그',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1, // prevent pinch-zoom messing with senior UX
  userScalable: false,
  themeColor: '#0E5C3A',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <LocaleProvider>
          <LangToggle />
          {children}
        </LocaleProvider>
      </body>
    </html>
  );
}
