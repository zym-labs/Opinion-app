// Design tokens from STAGE6_DESIGN_SYSTEM.md.
export const palette = {
  light: {
    bg: '#FAFAF7',
    surface: '#FFFFFF',
    surfaceMuted: '#F2F1EC',
    border: '#E4E2DA',
    text: '#16181D',
    textMuted: '#5F6470',
    textFaint: '#8C909A',
    primary: '#16181D',
    onPrimary: '#FFFFFF',
    optionA: '#4F46E5',
    optionASoft: '#EEF0FF',
    optionB: '#D97706',
    optionBText: '#B45309',
    optionBSoft: '#FFF4E0',
    ai: '#0E7C7B',
    success: '#15803D',
    warning: '#B45309',
    danger: '#B91C1C',
    focus: '#2563EB',
  },
  dark: {
    bg: '#0F1115',
    surface: '#171A21',
    surfaceMuted: '#1F232C',
    border: '#2A2F3A',
    text: '#F2F2EF',
    textMuted: '#A3A8B4',
    textFaint: '#6F7480',
    primary: '#F2F2EF',
    onPrimary: '#0F1115',
    optionA: '#8B85FF',
    optionASoft: '#23224A',
    optionB: '#F5B04A',
    optionBText: '#F5B04A',
    optionBSoft: '#3A2A12',
    ai: '#4FD1C5',
    success: '#4ADE80',
    warning: '#FBBF24',
    danger: '#F87171',
    focus: '#60A5FA',
  },
} as const;

export type ColorScheme = keyof typeof palette;
export type ColorToken = keyof typeof palette.light;

export const space = { 0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48, 16: 64 } as const;
export const radius = { sm: 8, md: 12, lg: 16, xl: 24, full: 999 } as const;

export const type = {
  display: { fontSize: 40, lineHeight: 44, fontWeight: '700' },
  title: { fontSize: 24, lineHeight: 30, fontWeight: '700' },
  question: { fontSize: 20, lineHeight: 27, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' },
  bodyStrong: { fontSize: 16, lineHeight: 24, fontWeight: '600' },
  label: { fontSize: 14, lineHeight: 20, fontWeight: '500' },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
  quote: { fontSize: 17, lineHeight: 26, fontWeight: '400', fontStyle: 'italic' },
} as const;
