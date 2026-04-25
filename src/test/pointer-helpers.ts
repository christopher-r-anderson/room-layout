/**
 * Pointer event helpers for RTTR component tests.
 *
 * ⚠️ IMPORTANT LIMITATIONS:
 *
 * RTTR can validate that event handlers are wired and called, but cannot test
 * actual DOM pointer behavior or geometry interactions. Specifically, RTTR
 * cannot populate or validate:
 * - event.ray (Three.js raycasting) No WebGL in jsdom
 * - actual DOM pointer capture/release (browser-specific behavior)
 * - Collision detection or geometry transforms based on pointer events
 *
 * For event dispatch sequencing (did the handler fire?), use firePointerEvent().
 * For actual pointer behavior (capture, drag, collision, raycasting), use
 * Playwright E2E tests where the real browser enforces the semantics.
 */

import type { R3FTestScene } from '@/test/r3f-renderer'

type R3FEventTarget = Parameters<R3FTestScene['fireEvent']>[0]

interface PointerEventData {
  pointerId?: number
  clientX?: number
  clientY?: number
  buttons?: number
}

/**
 * Dispatch a pointer event to an RTTR test instance.
 * Passes basic coordinate and pointerId data; does not populate event.ray.
 *
 * Use for: Testing event dispatch sequence, handler invocation order.
 * Do NOT use for: Validating drag math, collision detection, or ray casting.
 */
export async function firePointerEvent(
  renderer: R3FTestScene,
  target: R3FEventTarget,
  eventType: 'pointerDown' | 'pointerMove' | 'pointerUp' | 'pointerCancel',
  data: PointerEventData = {},
): Promise<void> {
  const { pointerId = 1, clientX = 0, clientY = 0, buttons } = data

  const eventData: Record<string, unknown> = {
    pointerId,
    clientX,
    clientY,
  }

  if (buttons !== undefined) {
    eventData.buttons = buttons
  }

  await renderer.fireEvent(target, eventType, eventData)
}

/**
 * Why we don't mock pointer capture in RTTR:
 *
 * Pointer capture is a browser API that RTTR cannot faithfully simulate in jsdom.
 * Mocking would create false confidence—tests would pass but real browser behavior
 * might differ. Instead, pointer capture validation belongs in Playwright E2E tests
 * where the browser enforces the actual API contract.
 *
 * Related behaviors that must be E2E tested:
 * - setPointerCapture() / releasePointerCapture() lifecycle
 * - Actual DOM event routing with capture active
 * - Pointer events reaching correct targets during drag
 */
