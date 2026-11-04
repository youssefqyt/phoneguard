/**
 * Coarse app categories used for category-level limits and analytics.
 * Clients may send a raw category string; unknown values are grouped as OTHER.
 */
export enum AppCategory {
  SOCIAL = 'SOCIAL',
  ENTERTAINMENT = 'ENTERTAINMENT',
  GAMES = 'GAMES',
  PRODUCTIVITY = 'PRODUCTIVITY',
  EDUCATION = 'EDUCATION',
  COMMUNICATION = 'COMMUNICATION',
  NEWS = 'NEWS',
  SHOPPING = 'SHOPPING',
  HEALTH = 'HEALTH',
  FINANCE = 'FINANCE',
  TRAVEL = 'TRAVEL',
  UTILITIES = 'UTILITIES',
  OTHER = 'OTHER',
}

export const APP_CATEGORY_VALUES = Object.values(AppCategory);

export function normaliseCategory(value?: string | null): AppCategory {
  if (!value) return AppCategory.OTHER;
  const upper = value.toUpperCase();
  return (APP_CATEGORY_VALUES as string[]).includes(upper)
    ? (upper as AppCategory)
    : AppCategory.OTHER;
}

/**
 * A pragmatic default mapping of well-known Android packages to categories.
 * Used to seed analytics when the device does not report a category.
 */
export const DEFAULT_PACKAGE_CATEGORIES: Record<string, AppCategory> = {
  'com.instagram.android': AppCategory.SOCIAL,
  'com.facebook.katana': AppCategory.SOCIAL,
  'com.twitter.android': AppCategory.SOCIAL,
  'com.snapchat.android': AppCategory.SOCIAL,
  'com.reddit.frontpage': AppCategory.SOCIAL,
  'com.zhiliaoapp.musically': AppCategory.SOCIAL, // TikTok
  'com.whatsapp': AppCategory.COMMUNICATION,
  'org.telegram.messenger': AppCategory.COMMUNICATION,
  'com.google.android.youtube': AppCategory.ENTERTAINMENT,
  'com.netflix.mediaclient': AppCategory.ENTERTAINMENT,
  'com.spotify.music': AppCategory.ENTERTAINMENT,
  'com.android.chrome': AppCategory.PRODUCTIVITY,
  'com.google.android.gm': AppCategory.COMMUNICATION,
  'com.google.android.apps.docs': AppCategory.PRODUCTIVITY,
  'com.microsoft.office.word': AppCategory.PRODUCTIVITY,
  'com.duolingo': AppCategory.EDUCATION,
  'com.google.android.apps.photos': AppCategory.UTILITIES,
  'com.amazon.mShop.android.shopping': AppCategory.SHOPPING,
  'com.android.settings': AppCategory.UTILITIES,
};

export const DISTRACTING_CATEGORIES: AppCategory[] = [
  AppCategory.SOCIAL,
  AppCategory.ENTERTAINMENT,
  AppCategory.GAMES,
];
