// Supported locales and their static metadata. Adding a locale is: extend
// SUPPORTED_LOCALES, add a direction entry, and drop a compiled `<locale>.po`
// catalog beside `en.po`. English is the source locale and ships statically.

export const DEFAULT_LOCALE = 'en'

// `en-XA` is the generated pseudo-locale (accent + length expansion), fetched
// only via ?lang=en-XA as its own lazy chunk so it never ships to users.
const SUPPORTED_LOCALES = ['en', 'en-XA'] as const

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]

// Drives `<html dir>`. Both current locales are LTR.
const LOCALE_DIRECTION: Record<SupportedLocale, 'ltr' | 'rtl'> = {
  en: 'ltr',
  'en-XA': 'ltr',
}

// Optional URL override (`?lang=`). An override for QA/E2E and a future embed
// hook - never the canonical signal, so it stays out of shared scene URLs.
export const LANG_QUERY_PARAM = 'lang'

// Where the resolved locale is remembered across visits.
export const LOCALE_STORAGE_KEY = 'room-layout:locale'

export function isSupportedLocale(value: string): value is SupportedLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value)
}

export function directionForLocale(locale: string): 'ltr' | 'rtl' {
  return isSupportedLocale(locale) ? LOCALE_DIRECTION[locale] : 'ltr'
}
