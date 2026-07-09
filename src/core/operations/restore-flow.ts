import type { MessageDescriptor } from '@lingui/core'
import { msg } from '@lingui/core/macro'
import type { FurnitureCatalogEntry } from '@/domain/catalog'
import {
  type ParseSceneUrlResult,
  validateCatalogReferences,
} from '@/core/persistence/scene-url'
import type { SceneDraftState } from '@/core/persistence/scene-draft'
import { i18n } from '@/shared/i18n/i18n'
import { feedback } from '@/core/stores/feedback-store'
import { editorLifecycleActions } from '@/core/stores/editor-lifecycle-store'
import type { FurnitureInstance } from '@/domain/furniture'

export interface RestorableState {
  items: FurnitureInstance[]
  floorFinishId?: string
  wallFinishId?: string
  lightingMoodId?: string
}

type DraftRestoreAttempt = 'restored' | 'failed' | 'missing'

// Message descriptors, not resolved strings: the report helpers translate them
// with `i18n._()` at fire-time, so only the branch actually taken resolves.
// `title` names the specific failure; `description` states the consequence.
interface InvalidRestoreCase {
  title: MessageDescriptor
  description: MessageDescriptor
}

// Copy tables for the invalid-link fallback branches. Descriptors resolve in
// the report helpers at fire-time, so only the branch actually taken is
// translated. Titles name the specific failure (invalid vs unknown furniture);
// the shared description states the consequence.
const STARTING_WITH_EMPTY_ROOM = msg`Starting with an empty room.`

const LINK_AND_DRAFT_NOT_RESTORED: InvalidRestoreCase = {
  title: msg`Shared link and draft could not be restored.`,
  description: STARTING_WITH_EMPTY_ROOM,
}

const INVALID_LINK_CASES = {
  recoveredMessage: msg`Shared link was invalid. Recovered your local draft.`,
  whenDraftMissing: {
    title: msg`Shared link could not be restored.`,
    description: STARTING_WITH_EMPTY_ROOM,
  },
  whenDraftFailed: LINK_AND_DRAFT_NOT_RESTORED,
}

// The link parsed and validated but failed to APPLY - an internal failure, not
// a malformed link - so the recovered-draft wording stays neutral instead of
// claiming the link "was invalid".
const APPLY_FAILED_LINK_CASES = {
  ...INVALID_LINK_CASES,
  recoveredMessage: msg`Shared link could not be restored. Recovered your local draft.`,
}

const UNKNOWN_FURNITURE_LINK_CASES = {
  recoveredMessage: msg`Shared link contained unknown furniture. Draft restored.`,
  whenDraftMissing: {
    title: msg`Shared link contained unrecognized furniture.`,
    description: STARTING_WITH_EMPTY_ROOM,
  },
  whenDraftFailed: LINK_AND_DRAFT_NOT_RESTORED,
}

function tryRestoreDraft(
  draftState: RestorableState | null,
  applyState: (state: RestorableState) => void,
): DraftRestoreAttempt {
  if (!draftState) {
    return 'missing'
  }

  try {
    applyState(draftState)
    return 'restored'
  } catch {
    return 'failed'
  }
}

function reportInvalidRestore(invalidCase: InvalidRestoreCase) {
  editorLifecycleActions.recordRestoreOutcome('invalid')
  feedback.actionError({
    title: i18n._(invalidCase.title),
    description: i18n._(invalidCase.description),
  })
}

function reportRecoveredDraftAfterInvalidLink(
  recoveredMessage: MessageDescriptor,
) {
  editorLifecycleActions.recordRestoreOutcome('invalid')
  feedback.actionWarning({ title: i18n._(recoveredMessage) })
}

function restoreFromInvalidLinkWithDraftFallback(
  applyState: (state: RestorableState) => void,
  draftState: RestorableState | null,
  options: {
    recoveredMessage: MessageDescriptor
    whenDraftMissing: InvalidRestoreCase
    whenDraftFailed: InvalidRestoreCase
  },
) {
  const draftRestore = tryRestoreDraft(draftState, applyState)

  if (draftRestore === 'restored') {
    reportRecoveredDraftAfterInvalidLink(options.recoveredMessage)
    return
  }

  reportInvalidRestore(
    draftRestore === 'failed'
      ? options.whenDraftFailed
      : options.whenDraftMissing,
  )
}

// A local draft only participates in restore when its references are valid.
export function validateDraftState(
  draft: SceneDraftState | null,
  catalog: FurnitureCatalogEntry[],
): SceneDraftState | null {
  return draft && validateCatalogReferences(draft.items, catalog) ? draft : null
}

export type PrimaryRestoreState =
  | { source: 'link'; state: RestorableState }
  | { source: 'draft'; state: SceneDraftState }
  | { source: 'none'; state: null }

// The single statement of restore precedence: a valid shared link wins, else a
// valid local draft, else nothing. The restore flow attempts this source first
// (its runtime fallbacks for apply failures stay below), and bootstrap derives
// the startup gate from the same selection - one rule, so the gate cannot
// silently diverge from what restore will attempt.
export function selectPrimaryRestoreState({
  parseResult,
  validDraftState,
  catalog,
}: {
  parseResult: ParseSceneUrlResult
  validDraftState: SceneDraftState | null
  catalog: FurnitureCatalogEntry[]
}): PrimaryRestoreState {
  if (parseResult.ok && validateCatalogReferences(parseResult.items, catalog)) {
    return { source: 'link', state: parseResult }
  }
  if (validDraftState) {
    return { source: 'draft', state: validDraftState }
  }
  return { source: 'none', state: null }
}

export function runStartupRestoreFlow(options: {
  parseResult: ParseSceneUrlResult
  catalog: FurnitureCatalogEntry[]
  validDraftState: SceneDraftState | null
  applyState: (state: RestorableState) => void
  isFreshState?: (state: RestorableState) => boolean
}) {
  const {
    parseResult,
    catalog,
    validDraftState,
    applyState,
    isFreshState = () => false,
  } = options

  const primary = selectPrimaryRestoreState({
    parseResult,
    validDraftState,
    catalog,
  })

  if (primary.source === 'link') {
    try {
      applyState(primary.state)
      editorLifecycleActions.recordRestoreOutcome('restored')
      feedback.actionSuccess({
        title: i18n._(msg`Room layout restored from shared link.`),
      })
    } catch {
      restoreFromInvalidLinkWithDraftFallback(
        applyState,
        validDraftState,
        APPLY_FAILED_LINK_CASES,
      )
    }
    return
  }

  if (parseResult.ok) {
    // The link parsed but references furniture the catalog does not know.
    restoreFromInvalidLinkWithDraftFallback(
      applyState,
      validDraftState,
      UNKNOWN_FURNITURE_LINK_CASES,
    )
    return
  }

  if (parseResult.reason !== 'no-param') {
    restoreFromInvalidLinkWithDraftFallback(
      applyState,
      validDraftState,
      INVALID_LINK_CASES,
    )
    return
  }

  if (validDraftState) {
    try {
      applyState(validDraftState)
      if (!isFreshState(validDraftState)) {
        feedback.actionSuccess({
          title: i18n._(msg`Restored your saved draft.`),
        })
      }
    } catch {
      reportInvalidRestore({
        title: msg`Draft could not be restored.`,
        description: STARTING_WITH_EMPTY_ROOM,
      })
      return
    }
  }

  editorLifecycleActions.recordRestoreOutcome('skipped')
}
