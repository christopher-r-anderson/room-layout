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
  notifications.setStatusMessage(invalidCase.statusMessage)
  notifications.announceAssertive(invalidCase.assertiveMessage)
  notifications.toastError(invalidCase.toastMessage)
}

function reportRecoveredDraftAfterInvalidLink(
  notifications: RestoreFlowNotifications,
  toastMessage: string,
) {
  const recoveredMessage = i18n._(
    msg`Shared link could not be restored. Recovered your local draft.`,
  )
  notifications.setRestoreOutcome('invalid')
  notifications.setStatusMessage(recoveredMessage)
  notifications.announceAssertive(recoveredMessage)
  notifications.toastWarning(toastMessage)
}

function restoreFromInvalidLinkWithDraftFallback(
  notifications: RestoreFlowNotifications,
  applyState: (state: RestorableState) => void,
  draftState: RestorableState | null,
  options: {
    recoveredToastMessage: string
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

  if (parseResult.ok) {
    if (validateCatalogReferences(parseResult.items, catalog)) {
      try {
        applyState(parseResult)
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
          {
            recoveredToastMessage: i18n._(
              msg`Shared link was invalid. Recovered your local draft.`,
            ),
            whenDraftMissing: {
              statusMessage: i18n._(
                msg`Shared link could not be restored. Starting with an empty room.`,
              ),
              assertiveMessage: i18n._(
                msg`Shared link could not be restored. Starting with an empty room.`,
              ),
              toastMessage: i18n._(msg`Shared link could not be restored.`),
            },
            whenDraftFailed: {
              statusMessage: i18n._(
                msg`Shared link could not be restored. Draft also failed to restore. Starting with an empty room.`,
              ),
              assertiveMessage: i18n._(
                msg`Shared link and draft could not be restored. Starting with an empty room.`,
              ),
              toastMessage: i18n._(
                msg`Shared link and draft could not be restored.`,
              ),
            },
          },
        )
      }
      return
    }

    restoreFromInvalidLinkWithDraftFallback(
      notifications,
      applyState,
      validDraftState,
      {
        recoveredToastMessage: i18n._(
          msg`Shared link contained unknown furniture. Draft restored.`,
        ),
        whenDraftMissing: {
          statusMessage: i18n._(
            msg`Shared link contained unrecognized furniture. Starting with an empty room.`,
          ),
          assertiveMessage: i18n._(
            msg`Shared link could not be restored. Starting with an empty room.`,
          ),
          toastMessage: i18n._(
            msg`Shared link contained unrecognized furniture.`,
          ),
        },
        whenDraftFailed: {
          statusMessage: i18n._(
            msg`Shared link had unknown furniture. Draft also failed to restore. Starting with an empty room.`,
          ),
          assertiveMessage: i18n._(
            msg`Shared link and draft could not be restored. Starting with an empty room.`,
          ),
          toastMessage: i18n._(
            msg`Shared link and draft could not be restored.`,
          ),
        },
      },
    )
    return
  }

  if (parseResult.reason !== 'no-param') {
    restoreFromInvalidLinkWithDraftFallback(
      notifications,
      applyState,
      validDraftState,
      {
        recoveredToastMessage: i18n._(
          msg`Shared link was invalid. Recovered your local draft.`,
        ),
        whenDraftMissing: {
          statusMessage: i18n._(
            msg`Shared link could not be restored. Starting with an empty room.`,
          ),
          assertiveMessage: i18n._(
            msg`Shared link could not be restored. Starting with an empty room.`,
          ),
          toastMessage: i18n._(msg`Shared link could not be restored.`),
        },
        whenDraftFailed: {
          statusMessage: i18n._(
            msg`Shared link was invalid. Draft also failed to restore. Starting with an empty room.`,
          ),
          assertiveMessage: i18n._(
            msg`Shared link and draft could not be restored. Starting with an empty room.`,
          ),
          toastMessage: i18n._(
            msg`Shared link and draft could not be restored.`,
          ),
        },
      },
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
        statusMessage: i18n._(
          msg`Draft failed to restore. Starting with an empty room.`,
        ),
        assertiveMessage: i18n._(
          msg`Draft could not be restored. Starting with an empty room.`,
        ),
        toastMessage: i18n._(msg`Draft could not be restored.`),
      })
      return
    }
  }

  notifications.setRestoreOutcome('skipped')
}
