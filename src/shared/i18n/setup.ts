import type { Messages } from '@lingui/core'
import { i18n } from './i18n'
import { messages as enMessages } from './locales/en.po'
import type { SupportedLocale } from './locales'
import {
  DEFAULT_LOCALE,
  LANG_QUERY_PARAM,
  LOCALE_STORAGE_KEY,
  directionForLocale,
  isSupportedLocale,
} from './locales'

// English is bundled and activated synchronously on import - the default path
// has no async gate or first-paint flash, and non-React callers (`i18n._(...)`)
// can translate immediately. Additional locales load lazily (see below).
i18n.load(DEFAULT_LOCALE, enMessages)
i18n.activate(DEFAULT_LOCALE)

// Non-default locales register a lazy import here; each becomes its own chunk
// under Rolldown. Adding a locale: create `locales/<locale>.po`, add it to
// SUPPORTED_LOCALES + LOCALE_DIRECTION, and add one loader line here.
const CATALOG_LOADERS: Partial<
  Record<SupportedLocale, () => Promise<{ messages: Messages }>>
> = {
  'en-XA': () => import('./locales/en-XA.po'),
}

const loadPromises = new Map<string, Promise<void>>()

function loadLocale(locale: string): Promise<void> {
  const loader = isSupportedLocale(locale) ? CATALOG_LOADERS[locale] : undefined
  // English (no registered loader) is already bundled; nothing to fetch.
  if (!loader) return Promise.resolve()
  const existing = loadPromises.get(locale)
  if (existing) return existing
  const promise = loader()
    .then(({ messages }) => {
      i18n.load(locale, messages)
    })
    .catch((error: unknown) => {
      // Drop the rejected promise so a later attempt can retry the chunk.
      loadPromises.delete(locale)
      throw error
    })
  loadPromises.set(locale, promise)
  return promise
}

function applyDocumentLocale(locale: string): void {
  document.documentElement.lang = locale
  document.documentElement.dir = directionForLocale(locale)
}

function readQueryLocale(): SupportedLocale | null {
  const value = new URLSearchParams(window.location.search).get(
    LANG_QUERY_PARAM,
  )
  return value && isSupportedLocale(value) ? value : null
}

function readStoredLocale(): SupportedLocale | null {
  try {
    const value = window.localStorage.getItem(LOCALE_STORAGE_KEY)
    return value && isSupportedLocale(value) ? value : null
  } catch {
    return null
  }
}

function readNavigatorLocale(): SupportedLocale | null {
  // `navigator.languages` is typed as always-present but can be absent in some
  // embedded/test browsers, so guard before spreading.
  const languages = window.navigator.languages as readonly string[] | undefined
  const candidates =
    languages && languages.length > 0 ? languages : [window.navigator.language]
  for (const candidate of candidates) {
    // Prefer an exact match (e.g. `pt-BR`) before falling back to the base
    // language (`pt`), so a supported regional locale is not skipped.
    if (isSupportedLocale(candidate)) return candidate
    const base = candidate.split('-')[0]
    if (isSupportedLocale(base)) return base
  }
  return null
}

// `?lang=` override (QA/E2E + embed hook) -> persisted choice -> browser -> default.
function resolveLocale(): SupportedLocale {
  return (
    readQueryLocale() ??
    readStoredLocale() ??
    readNavigatorLocale() ??
    DEFAULT_LOCALE
  )
}

// Loads (if needed), activates, and reflects a locale on <html>. The `?lang=`
// override is intentionally transient and not persisted; a stored preference is
// honored on read but would only ever be written by an explicit in-app choice
// (no such switcher exists yet).
async function switchLocale(locale: string): Promise<void> {
  await loadLocale(locale)
  i18n.activate(locale)
  applyDocumentLocale(locale)
}

// Called once at startup, before React renders. English is already active from
// module load, so the default path returns nothing and renders synchronously. A
// non-default locale returns a promise the entry gates the first render on, so
// its catalog is active before any text or startup side effect resolves.
export function initI18n(): Promise<void> | undefined {
  const locale: string = resolveLocale()
  applyDocumentLocale(DEFAULT_LOCALE)
  if (locale === DEFAULT_LOCALE) return undefined
  return switchLocale(locale).catch(() => {
    // A failed catalog load leaves the already-active English in place.
  })
}
