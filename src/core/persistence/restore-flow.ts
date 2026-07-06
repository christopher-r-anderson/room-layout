import type { MessageDescriptor } from '@lingui/core'
import { msg } from '@lingui/core/macro'
import type { FurnitureCatalogEntry } from '@/domain/catalog'
import {
  type ParseSceneUrlResult,
  validateCatalogReferences,
} from '@/core/persistence/scene-url'
import type { SceneDraftState } from '@/core/persistence/scene-draft'
import { i18n } from '@/shared/i18n/i18n'
import type {
  DraftRestoreAttempt,
  InvalidRestoreCase,
  RestorableState,
  RestoreFlowNotifications,
} from './restore-flow.types'

// Copy tables for the invalid-link fallback branches. Descriptors resolve in
// the report helpers at fire-time, so only the branch actually taken is
// translated. The wording differences between tables are deliberate: the toast
// names the specific failure (invalid vs unknown furniture) while the
// status/announcement wording stays uniform.
const LINK_NOT_RESTORED_EMPTY_ROOM = msg`Shared link could not be restored. Starting with an empty room.`

const LINK_AND_DRAFT_NOT_RESTORED_EMPTY_ROOM = msg`Shared link and draft could not be restored. Starting with an empty room.`

const LINK_AND_DRAFT_NOT_RESTORED = msg`Shared link and draft could not be restored.`

const WHEN_DRAFT_MISSING: InvalidRestoreCase = {
  statusMessage: LINK_NOT_RESTORED_EMPTY_ROOM,
  assertiveMessage: LINK_NOT_RESTORED_EMPTY_ROOM,
  toastMessage: msg`Shared link could not be restored.`,
}

const INVALID_LINK_CASES = {
  recoveredToastMessage: msg`Shared link was invalid. Recovered your local draft.`,
  whenDraftMissing: WHEN_DRAFT_MISSING,
  whenDraftFailed: {
    statusMessage: msg`Shared link was invalid. Draft also failed to restore. Starting with an empty room.`,
    assertiveMessage: LINK_AND_DRAFT_NOT_RESTORED_EMPTY_ROOM,
    toastMessage: LINK_AND_DRAFT_NOT_RESTORED,
  },
}

// Same shape as INVALID_LINK_CASES, but the link parsed and then failed to
// apply, so the draft-failed status says "could not be restored" rather than
// "was invalid".
const APPLY_FAILED_LINK_CASES = {
  ...INVALID_LINK_CASES,
  whenDraftFailed: {
    ...INVALID_LINK_CASES.whenDraftFailed,
    statusMessage: msg`Shared link could not be restored. Draft also failed to restore. Starting with an empty room.`,
  },
}

const UNKNOWN_FURNITURE_LINK_CASES = {
  recoveredToastMessage: msg`Shared link contained unknown furniture. Draft restored.`,
  whenDraftMissing: {
    statusMessage: msg`Shared link contained unrecognized furniture. Starting with an empty room.`,
    assertiveMessage: LINK_NOT_RESTORED_EMPTY_ROOM,
    toastMessage: msg`Shared link contained unrecognized furniture.`,
  },
  whenDraftFailed: {
    statusMessage: msg`Shared link had unknown furniture. Draft also failed to restore. Starting with an empty room.`,
    assertiveMessage: LINK_AND_DRAFT_NOT_RESTORED_EMPTY_ROOM,
    toastMessage: LINK_AND_DRAFT_NOT_RESTORED,
  },
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

function reportInvalidRestore(
  notifications: RestoreFlowNotifications,
  invalidCase: InvalidRestoreCase,
) {
  notifications.setRestoreOutcome('invalid')
  notifications.setStatusMessage(i18n._(invalidCase.statusMessage))
  notifications.announceAssertive(i18n._(invalidCase.assertiveMessage))
  notifications.toastError(i18n._(invalidCase.toastMessage))
}

function reportRecoveredDraftAfterInvalidLink(
  notifications: RestoreFlowNotifications,
  toastMessage: MessageDescriptor,
) {
  const recoveredMessage = i18n._(
    msg`Shared link could not be restored. Recovered your local draft.`,
  )
  notifications.setRestoreOutcome('invalid')
  notifications.setStatusMessage(recoveredMessage)
  notifications.announceAssertive(recoveredMessage)
  notifications.toastWarning(i18n._(toastMessage))
}

function restoreFromInvalidLinkWithDraftFallback(
  notifications: RestoreFlowNotifications,
  applyState: (state: RestorableState) => void,
  draftState: RestorableState | null,
  options: {
    recoveredToastMessage: MessageDescriptor
    whenDraftMissing: InvalidRestoreCase
    whenDraftFailed: InvalidRestoreCase
  },
) {
  const draftRestore = tryRestoreDraft(draftState, applyState)

  if (draftRestore === 'restored') {
    reportRecoveredDraftAfterInvalidLink(
      notifications,
      options.recoveredToastMessage,
    )
    return
  }

  reportInvalidRestore(
    notifications,
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
  notifications: RestoreFlowNotifications
}) {
  const {
    parseResult,
    catalog,
    validDraftState,
    applyState,
    isFreshState = () => false,
    notifications,
  } = options

  const primary = selectPrimaryRestoreState({
    parseResult,
    validDraftState,
    catalog,
  })

  if (primary.source === 'link') {
    try {
      applyState(primary.state)
      notifications.setRestoreOutcome('restored')
      const restoredFromLink = i18n._(
        msg`Room layout restored from shared link.`,
      )
      notifications.announcePolite(restoredFromLink)
      notifications.toastSuccess(restoredFromLink)
    } catch {
      restoreFromInvalidLinkWithDraftFallback(
        notifications,
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
      notifications,
      applyState,
      validDraftState,
      UNKNOWN_FURNITURE_LINK_CASES,
    )
    return
  }

  if (parseResult.reason !== 'no-param') {
    restoreFromInvalidLinkWithDraftFallback(
      notifications,
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
        const restoredDraft = i18n._(msg`Restored your saved draft.`)
        notifications.announcePolite(restoredDraft)
        notifications.toastSuccess(restoredDraft)
      }
    } catch {
      reportInvalidRestore(notifications, {
        statusMessage: msg`Draft failed to restore. Starting with an empty room.`,
        assertiveMessage: msg`Draft could not be restored. Starting with an empty room.`,
        toastMessage: msg`Draft could not be restored.`,
      })
      return
    }
  }

  notifications.setRestoreOutcome('skipped')
}
