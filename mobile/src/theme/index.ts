/**
 * PhoneGuard design tokens.
 *
 * A calm, high-contrast dark palette: screen-time data should feel
 * informative rather than alarming, so accents are used sparingly.
 */

export const colors = {
  // Surfaces
  background: '#0B1020',
  surface: '#141A2E',
  surfaceAlt: '#1C2440',
  border: '#26304F',

  // Text
  text: '#F5F7FF',
  textMuted: '#9AA5C4',
  textFaint: '#8792B0',

  // Brand
  primary: '#6C7BFF',
  primaryDark: '#4B5AE0',
  primarySoft: 'rgba(108, 123, 255, 0.16)',

  // Semantic
  success: '#3DDC97',
  successSoft: 'rgba(61, 220, 151, 0.16)',
  warning: '#FFB020',
  warningSoft: 'rgba(255, 176, 32, 0.16)',
  danger: '#FF5C7A',
  dangerSoft: 'rgba(255, 92, 122, 0.16)',
  info: '#39C0ED',
  infoSoft: 'rgba(57, 192, 237, 0.16)',

  // Category palette (usage breakdowns)
  categories: {
    SOCIAL: '#6C7BFF',
    ENTERTAINMENT: '#FF5C7A',
    GAMES: '#FFB020',
    PRODUCTIVITY: '#3DDC97',
    EDUCATION: '#39C0ED',
    COMMUNICATION: '#A78BFA',
    NEWS: '#F97316',
    SHOPPING: '#EC4899',
    HEALTH: '#14B8A6',
    FINANCE: '#84CC16',
    TRAVEL: '#06B6D4',
    UTILITIES: '#94A3B8',
    OTHER: '#64748B',
  } as const,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 18,
  xl: 24,
  pill: 999,
} as const;

export const typography = {
  display: { fontSize: 32, fontWeight: '700' as const, letterSpacing: -0.5 },
  title: { fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.3 },
  heading: { fontSize: 17, fontWeight: '700' as const },
  body: { fontSize: 15, fontWeight: '500' as const },
  label: { fontSize: 13, fontWeight: '600' as const },
  caption: { fontSize: 12, fontWeight: '500' as const },
  tiny: { fontSize: 11, fontWeight: '600' as const },
} as const;

export function categoryColor(category?: string | null): string {
  if (!category) return colors.categories.OTHER;
  const key = category.toUpperCase() as keyof typeof colors.categories;
  return colors.categories[key] ?? colors.categories.OTHER;
}

export const theme = { colors, spacing, radii, typography, categoryColor };
export type Theme = typeof theme;
