import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // Warm, calm palette — high contrast for older eyes
        bg: '#FBF7F0',        // warm off-white
        surface: '#FFFFFF',
        ink: '#1C1A17',       // near-black, warm
        muted: '#5C544A',     // warm gray for secondary text
        line: '#E5DFD3',      // warm border
        primary: {
          DEFAULT: '#0E5C3A', // deep green — calm, trustworthy
          ink: '#FFFFFF',
        },
        accent: {
          DEFAULT: '#C24D2C', // warm terracotta for accents
          ink: '#FFFFFF',
        },
        success: '#2F7D3E',
        warning: '#B8860B',
        danger: '#A8311A',
      },
      fontFamily: {
        // Pretendard is the de-facto Korean web font, excellent legibility
        sans: ['Pretendard', 'Apple SD Gothic Neo', 'system-ui', 'sans-serif'],
        // Display: GmarketSans for warmth on headings
        display: ['"GmarketSansBold"', 'Pretendard', 'sans-serif'],
      },
      fontSize: {
        // Senior-scaled sizes — base is 18px, not 16px
        'xs': ['14px', { lineHeight: '1.5' }],
        'sm': ['16px', { lineHeight: '1.6' }],
        'base': ['18px', { lineHeight: '1.7' }],
        'lg': ['20px', { lineHeight: '1.6' }],
        'xl': ['24px', { lineHeight: '1.4' }],
        '2xl': ['28px', { lineHeight: '1.3' }],
        '3xl': ['34px', { lineHeight: '1.2' }],
        '4xl': ['42px', { lineHeight: '1.1' }],
      },
      spacing: {
        // Generous touch targets — Apple says 44px min, we go 56px for seniors
        'touch': '56px',
        'touch-lg': '64px',
      },
      borderRadius: {
        'xl': '16px',
        '2xl': '20px',
      },
      boxShadow: {
        'card': '0 1px 3px rgba(28, 26, 23, 0.04), 0 4px 12px rgba(28, 26, 23, 0.04)',
        'lift': '0 4px 16px rgba(28, 26, 23, 0.08)',
      },
    },
  },
  plugins: [],
};

export default config;
