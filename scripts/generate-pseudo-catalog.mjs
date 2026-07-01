import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { formatter } from '@lingui/format-po'

// Generates the `en-XA` pseudo-locale catalog from the English source. `en-XA` is
// the conventional BCP-47 tag for an accented+expanded pseudo-locale (its base
// subtag `en` is valid, so it passes a11y lang checks).
//
// The transform: accent every letter; expand length, with shorter strings
// expanded proportionally more (short UI labels grow most across languages);
// bracket each string so truncation is visible. Placeholders ({name}, ICU `#`)
// are preserved verbatim; messages with ICU plural/select syntax are bracketed
// but not accented so their structure is not mangled.
//
// Output is deterministic (no dates, no line numbers) so `i18n:check` can gate
// drift; the Vite plugin compiles the resulting `.po` on import.

const LOCALES_DIR = path.resolve('src/shared/i18n/locales')
const SOURCE = path.join(LOCALES_DIR, 'en.po')
const TARGET = path.join(LOCALES_DIR, 'en-XA.po')

const ACCENTS = {
  a: 'à',
  b: 'ƀ',
  c: 'ć',
  d: 'ď',
  e: 'ē',
  f: 'ƒ',
  g: 'ğ',
  h: 'ĥ',
  i: 'ĩ',
  j: 'ĵ',
  k: 'ķ',
  l: 'ĺ',
  m: 'ḿ',
  n: 'ń',
  o: 'ō',
  p: 'ƥ',
  q: 'q',
  r: 'ŕ',
  s: 'ś',
  t: 'ţ',
  u: 'ũ',
  v: 'v',
  w: 'ŵ',
  x: 'x',
  y: 'ŷ',
  z: 'ź',
  A: 'À',
  B: 'Ɓ',
  C: 'Ć',
  D: 'Ď',
  E: 'Ē',
  F: 'Ƒ',
  G: 'Ğ',
  H: 'Ĥ',
  I: 'Ĩ',
  J: 'Ĵ',
  K: 'Ķ',
  L: 'Ĺ',
  M: 'Ḿ',
  N: 'Ń',
  O: 'Ō',
  P: 'Ƥ',
  Q: 'Q',
  R: 'Ŕ',
  S: 'Ś',
  T: 'Ţ',
  U: 'Ũ',
  V: 'V',
  W: 'Ŵ',
  X: 'X',
  Y: 'Ŷ',
  Z: 'Ź',
}

const PAD = [...'āēīōūáéíóú']

// Shorter strings need proportionally more expansion than long ones (a short
// button label can triple in length across languages, a paragraph grows ~30%).
function targetRatio(length) {
  if (length <= 10) return 1.9
  if (length <= 20) return 1.7
  if (length <= 30) return 1.55
  return 1.4
}

function accent(text) {
  let out = ''
  for (const ch of text) out += ACCENTS[ch] ?? ch
  return out
}

// Accent a literal text run and pad it (with accented filler) up to its
// length-based target, leaving digits/punctuation/whitespace-only runs alone.
function accentAndExpand(text) {
  const accented = accent(text)
  const visible = text.replace(/\s/g, '').length
  if (visible === 0) return accented
  const target = Math.ceil(text.length * targetRatio(text.length))
  const chars = [...accented]
  for (let i = 0; chars.length < target; i++) chars.push(PAD[i % PAD.length])
  return chars.join('')
}

// ICU plural/select messages have keywords (plural/select/one/other) and nested
// braces that character substitution would corrupt. Until a proper ICU-aware
// transform is needed, such messages are bracketed but left un-accented.
const ICU_COMPLEX = /,\s*(plural|select|selectordinal)\s*,/i

function pseudoize(message) {
  if (ICU_COMPLEX.test(message)) return message
  return message
    .split(/(\{[^}]*\}|#)/g)
    .map((part) =>
      part === '#' || (part.startsWith('{') && part.endsWith('}'))
        ? part
        : accentAndExpand(part),
    )
    .join('')
}

const fmt = formatter({ origins: false, lineNumbers: false })
const catalog = fmt.parse(readFileSync(SOURCE, 'utf8'), {
  locale: 'en-XA',
  sourceLocale: 'en',
})

for (const entry of Object.values(catalog)) {
  const source = entry.message ?? ''
  entry.translation = source ? `[${pseudoize(source)}]` : ''
}

let serialized = fmt.serialize(catalog, {
  locale: 'en-XA',
  sourceLocale: 'en',
})

// Blank the volatile creation timestamp so regeneration is byte-stable.
serialized = serialized.replace(
  /^"POT-Creation-Date:.*\\n"$/m,
  '"POT-Creation-Date: \\n"',
)

writeFileSync(TARGET, serialized)
console.log(`Wrote ${Object.keys(catalog).length} pseudo messages to ${TARGET}`)
