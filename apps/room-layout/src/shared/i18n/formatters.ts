import { i18n } from './i18n'
import { DEFAULT_LOCALE } from './locales'

// Locale-aware number/unit formatting on native `Intl`. Formatter instances are
// expensive to construct, so they are memoized per locale + options.

function activeLocale(): string {
  return i18n.locale || DEFAULT_LOCALE
}

const numberFormatCache = new Map<string, Intl.NumberFormat>()

function numberFormat(options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const locale = activeLocale()
  const key = `${locale} ${JSON.stringify(options)}`
  let formatter = numberFormatCache.get(key)
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, options)
    numberFormatCache.set(key, formatter)
  }
  return formatter
}

/**
 * A plain decimal with no unit, trailing zeros trimmed (Intl drops them when
 * minimumFractionDigits is 0). Used for editable numeric fields whose unit lives
 * in the label, e.g. "Rotation (deg)".
 */
export function formatDecimal(
  value: number,
  maximumFractionDigits: number,
): string {
  return numberFormat({ maximumFractionDigits }).format(value)
}

/** Long-form distance for screen-reader announcements, e.g. "1.2 meters". */
export function formatDistanceMeters(value: number): string {
  return numberFormat({
    style: 'unit',
    unit: 'meter',
    unitDisplay: 'long',
    maximumFractionDigits: 1,
  }).format(value)
}

/** A fraction in [0, 1] rendered as a locale-aware percentage, e.g. "42%". */
export function formatPercent(fraction: number): string {
  return numberFormat({ style: 'percent', maximumFractionDigits: 0 }).format(
    fraction,
  )
}
