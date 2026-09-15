import { expect, test } from 'vitest'

// Inline-axis Tailwind utilities that have a logical equivalent and should flip
// with reading direction. Feature and primitive code uses the logical form
// instead: ms-/me-, ps-/pe-, text-start/text-end, border-s/border-e,
// rounded-s/rounded-e. Block-axis utilities (mt/mb, pt/pb, border-t/border-b,
// rounded-t/rounded-b, top/bottom) are unaffected and not matched here.
//
// Genuinely physical or ergonomic placement is exempt and stays physical: scene
// transform anchors, the right-pinned camera/room cluster, dialog centering, the
// tooltip arrow geometry, and third-party direction APIs (vaul). Those are
// positional left-/right-/inset utilities, which this guard does not police, plus
// the one margin case marked inline with `logical-css-allow`.
const PHYSICAL_UTILITY =
  /\b(?:ml|mr|pl|pr)-(?:\d|\[|auto|px)|\btext-(?:left|right)\b|\bborder-(?:l|r)\b|\brounded-(?:tl|tr|bl|br|l|r)\b/

const ALLOW_MARKER = 'logical-css-allow'

const sources = import.meta.glob('/src/**/*.{ts,tsx}', {
  query: '?raw',
  eager: true,
  import: 'default',
})

function findPhysicalUtilityUsages(): string[] {
  return Object.entries(sources).flatMap(([path, content]) => {
    if (typeof content !== 'string' || path.includes('.test.')) return []
    const lines = content.split('\n')
    return lines.flatMap((line, index) => {
      const previous = index === 0 ? '' : lines[index - 1]
      const allowed =
        line.includes(ALLOW_MARKER) || previous.includes(ALLOW_MARKER)
      return PHYSICAL_UTILITY.test(line) && !allowed
        ? [`${path}:${String(index + 1)}: ${line.trim()}`]
        : []
    })
  })
}

test('source uses logical inline-axis utilities instead of physical ones', () => {
  expect(findPhysicalUtilityUsages()).toEqual([])
})
