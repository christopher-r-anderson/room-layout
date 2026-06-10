import type { FurnitureCatalogEntry } from '@/scene/objects/furniture-catalog'
import {
  type ParseSceneUrlResult,
  validateCatalogReferences,
} from '@/app/url-scene/scene-url'
import type { SceneDraftState } from '@/app/url-scene/scene-draft'
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
  notifications.setEditorMessage(invalidCase.editorMessage)
  notifications.announceAssertive(invalidCase.assertiveMessage)
  notifications.toastError(invalidCase.toastMessage)
}

function reportRecoveredDraftAfterInvalidLink(
  notifications: RestoreFlowNotifications,
  toastMessage: string,
) {
  const recoveredMessage =
    'Shared link could not be restored. Recovered your local draft.'
  notifications.setRestoreOutcome('invalid')
  notifications.setEditorMessage(recoveredMessage)
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
        notifications.announcePolite('Room layout restored from shared link.')
        notifications.toastSuccess('Room layout restored from shared link.')
      } catch {
        restoreFromInvalidLinkWithDraftFallback(
          notifications,
          applyState,
          validDraftState,
          {
            recoveredToastMessage:
              'Shared link was invalid. Recovered your local draft.',
            whenDraftMissing: {
              editorMessage:
                'Shared link could not be restored. Starting with an empty room.',
              assertiveMessage:
                'Shared link could not be restored. Starting with an empty room.',
              toastMessage: 'Shared link could not be restored.',
            },
            whenDraftFailed: {
              editorMessage:
                'Shared link could not be restored. Draft also failed to restore. Starting with an empty room.',
              assertiveMessage:
                'Shared link and draft could not be restored. Starting with an empty room.',
              toastMessage: 'Shared link and draft could not be restored.',
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
        recoveredToastMessage:
          'Shared link contained unknown furniture. Draft restored.',
        whenDraftMissing: {
          editorMessage:
            'Shared link contained unrecognized furniture. Starting with an empty room.',
          assertiveMessage:
            'Shared link could not be restored. Starting with an empty room.',
          toastMessage: 'Shared link contained unrecognized furniture.',
        },
        whenDraftFailed: {
          editorMessage:
            'Shared link had unknown furniture. Draft also failed to restore. Starting with an empty room.',
          assertiveMessage:
            'Shared link and draft could not be restored. Starting with an empty room.',
          toastMessage: 'Shared link and draft could not be restored.',
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
        recoveredToastMessage:
          'Shared link was invalid. Recovered your local draft.',
        whenDraftMissing: {
          editorMessage:
            'Shared link could not be restored. Starting with an empty room.',
          assertiveMessage:
            'Shared link could not be restored. Starting with an empty room.',
          toastMessage: 'Shared link could not be restored.',
        },
        whenDraftFailed: {
          editorMessage:
            'Shared link was invalid. Draft also failed to restore. Starting with an empty room.',
          assertiveMessage:
            'Shared link and draft could not be restored. Starting with an empty room.',
          toastMessage: 'Shared link and draft could not be restored.',
        },
      },
    )
    return
  }

  if (validDraftState) {
    try {
      applyState(validDraftState)
      if (!isFreshState(validDraftState)) {
        notifications.announcePolite('Restored your saved draft.')
        notifications.toastSuccess('Restored your saved draft.')
      }
    } catch {
      reportInvalidRestore(notifications, {
        editorMessage: 'Draft failed to restore. Starting with an empty room.',
        assertiveMessage:
          'Draft could not be restored. Starting with an empty room.',
        toastMessage: 'Draft could not be restored.',
      })
      return
    }
  }

  notifications.setRestoreOutcome('skipped')
}
