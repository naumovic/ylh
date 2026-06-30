import type { Config } from 'tailwindcss';

// Brand: trustworthy & clean, solar-amber on deep navy, light theme.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: { 700: '#27465F', 900: '#14304B' },
        amber: { 500: '#F2A900', 600: '#D9930A' },
        ink: '#1A2433',
        muted: '#5B6B7C',
        surface: '#FFFFFF',
        canvas: '#F7F9FB',
        hairline: '#E6EBF0',
        good: '#2E9E6B',
        warn: '#E0922F',
        danger: '#D1483B',
      },
      borderRadius: { xl: '12px' },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      fontFeatureSettings: { tnum: '"tnum"' },
    },
  },
  plugins: [],
} satisfies Config;
