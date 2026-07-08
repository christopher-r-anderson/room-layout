import AxeBuilder from '@axe-core/playwright'
import { expect, type Page } from '@playwright/test'

// Scope the audit to the WCAG 2.2 A/AA conformance target rather than axe's full
// default ruleset (which folds in best-practice rules that are not a conformance
// goal and add noise on a canvas-heavy page).
const WCAG_AA_TAGS = [
  'wcag2a',
  'wcag2aa',
  'wcag21a',
  'wcag21aa',
  // axe-core currently ships no wcag22a-tagged rules (the 2.2 A-level
  // criteria are not automatable); listed so any future ones are picked up.
  'wcag22a',
  'wcag22aa',
]

export async function expectNoA11yViolations(page: Page, stateLabel: string) {
  const result = await new AxeBuilder({ page }).withTags(WCAG_AA_TAGS).analyze()

  expect(
    result.violations,
    `Expected no axe violations for state: ${stateLabel}`,
  ).toEqual([])
}
