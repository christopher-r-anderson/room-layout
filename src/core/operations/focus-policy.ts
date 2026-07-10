/** The focus-routable editor surfaces. */
export type FocusableSurface =
  | 'scene'
  | 'item-collection'
  | 'inspector'
  | 'item-actions'

/**
 * Where the producing gesture happened. Extends the focusable surfaces with
 * 'chrome' (persistent controls like the header, where focus survives the
 * operation) and 'unknown' (focus was on the document body).
 */
export type FocusOriginSurface = FocusableSurface | 'chrome' | 'unknown'

export type GestureModality = 'keyboard' | 'pointer'

export interface FocusGestureOrigin {
  modality: GestureModality | null
  surface: FocusOriginSurface
}

// Semantic focus intents. Surface intents come from explicit pane commands
// where the user named the surface; selected-item intents come from state
// changes ("focus whatever now matters") and leave the surface choice to the
// resolver.
export type FocusIntent =
  | { kind: 'surface'; surface: FocusableSurface }
  | { kind: 'selected-item'; operation: 'delete'; neighborIndex: number }
  | { kind: 'selected-item'; operation: 'history'; targetItemId: string | null }

/** Landing inside the item collection; realization and fallbacks belong to the surface. */
type ItemCollectionTarget =
  | { kind: 'auto' } // the selected item, else the first item, else the container
  | { kind: 'index'; index: number }
  | { kind: 'item'; itemId: string }
  | { kind: 'container' }

export type FocusDirective =
  | { surface: 'scene' }
  | { surface: 'item-collection'; target: ItemCollectionTarget }
  | { surface: 'inspector' }
  | { surface: 'item-actions' }

export type FocusAnnouncement =
  | 'no-selection-moved-to-list'
  | 'no-selection'
  | 'list-unavailable'

export interface FocusResolution {
  /** null drops the focus move; the operation's own announcement still fires. */
  directive: FocusDirective | null
  announcement: FocusAnnouncement | null
}

export interface FocusResolveContext {
  layout: 'desktop' | 'mobile'
  /** Read after the producing mutation. */
  hasSelection: boolean
}

const DROP: FocusResolution = { directive: null, announcement: null }

/**
 * The focus-routing policy: resolves a semantic intent against the gesture's
 * origin and the current layout to at most one mounted surface. Pure; every
 * cell of the policy table lives in this module's tests.
 */
export function resolveFocusIntent(
  intent: FocusIntent,
  origin: FocusGestureOrigin,
  context: FocusResolveContext,
): FocusResolution {
  if (intent.kind === 'surface') {
    return resolveSurfaceIntent(intent.surface, context)
  }

  return intent.operation === 'delete'
    ? resolveDeleteIntent(origin, intent.neighborIndex, context)
    : resolveHistoryIntent(origin, intent.targetItemId, context)
}

function resolveSurfaceIntent(
  surface: FocusableSurface,
  context: FocusResolveContext,
): FocusResolution {
  if (surface === 'scene') {
    return { directive: { surface: 'scene' }, announcement: null }
  }

  if (surface === 'item-collection') {
    return context.layout === 'desktop'
      ? {
          directive: { surface: 'item-collection', target: { kind: 'auto' } },
          announcement: null,
        }
      : { directive: null, announcement: 'list-unavailable' }
  }

  // The inspector and item actions only exist while something is selected.
  if (!context.hasSelection) {
    return context.layout === 'desktop'
      ? {
          directive: { surface: 'item-collection', target: { kind: 'auto' } },
          announcement: 'no-selection-moved-to-list',
        }
      : { directive: null, announcement: 'no-selection' }
  }

  return { directive: { surface }, announcement: null }
}

// Delete destroys the control that held focus (the confirm dialog closes onto
// a removed trigger), so focus is always repaired regardless of modality:
// never let it fall to the document body.
function resolveDeleteIntent(
  origin: FocusGestureOrigin,
  neighborIndex: number,
  context: FocusResolveContext,
): FocusResolution {
  if (origin.surface === 'scene') {
    return { directive: { surface: 'scene' }, announcement: null }
  }

  return context.layout === 'desktop'
    ? {
        directive: {
          surface: 'item-collection',
          target: { kind: 'index', index: neighborIndex },
        },
        announcement: null,
      }
    : { directive: { surface: 'scene' }, announcement: null }
}

// Undo/redo never move focus across surfaces: they reveal the change within
// the surface the keyboard user is working in, and otherwise rely on the
// operation's live-region announcement.
function resolveHistoryIntent(
  origin: FocusGestureOrigin,
  targetItemId: string | null,
  context: FocusResolveContext,
): FocusResolution {
  if (origin.modality !== 'keyboard') {
    return DROP
  }

  if (origin.surface === 'scene' || origin.surface === 'chrome') {
    // Focus survives in place; selection sync and the announcement carry it.
    return DROP
  }

  const itemCollectionTarget: ItemCollectionTarget = targetItemId
    ? { kind: 'item', itemId: targetItemId }
    : { kind: 'container' }

  if (origin.surface === 'item-collection') {
    // A mobile claim can only be stale (the collection is desktop-only), so
    // never mint a directive no surface would realize.
    return context.layout === 'desktop'
      ? {
          directive: {
            surface: 'item-collection',
            target: itemCollectionTarget,
          },
          announcement: null,
        }
      : DROP
  }

  if (origin.surface === 'inspector' || origin.surface === 'item-actions') {
    if (context.hasSelection) {
      // The panels re-render to the restored selection; focus survives.
      return DROP
    }

    // The panels unmounted under focus; repair to a stable named surface.
    return context.layout === 'desktop'
      ? {
          directive: {
            surface: 'item-collection',
            target: { kind: 'container' },
          },
          announcement: null,
        }
      : { directive: { surface: 'scene' }, announcement: null }
  }

  // Unknown origin (focus was on the body): the desktop item collection is the
  // named landing surface; mobile relies on the announcement.
  return context.layout === 'desktop'
    ? {
        directive: { surface: 'item-collection', target: itemCollectionTarget },
        announcement: null,
      }
    : DROP
}
