import AxeBuilder from '@axe-core/playwright'
import { expect, type Page } from '@playwright/test'

export async function expectNoA11yViolations(page: Page, stateLabel: string) {
  const result = await new AxeBuilder({ page }).analyze()

  expect(
    result.violations,
    `Expected no axe violations for state: ${stateLabel}`,
  ).toEqual([])
}
