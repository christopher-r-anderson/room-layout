import type { R3FTestScene } from './r3f-renderer'

type R3FEventTarget = Parameters<R3FTestScene['fireEvent']>[0]

interface PointerEventData {
  pointerId?: number
  clientX?: number
  clientY?: number
  buttons?: number
}

/**
 * Handler sequencing only: RTTR cannot populate event.ray or real pointer
 * capture, so drag math, collision, and geometry need Playwright.
 */
export async function firePointerEvent(
  renderer: R3FTestScene,
  target: R3FEventTarget,
  eventType:
    | 'pointerDown'
    | 'pointerMove'
    | 'pointerUp'
    | 'pointerCancel'
    | 'pointerEnter'
    | 'pointerLeave',
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
