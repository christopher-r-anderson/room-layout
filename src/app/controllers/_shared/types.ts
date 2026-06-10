import type { RestoreOutcome } from '@/editor-state/editor-runtime-store'
import type { FurnitureInstance } from '@/scene/objects/furniture.types'

export interface RestorableState {
  items: FurnitureInstance[]
  floorFinishId?: string
  wallFinishId?: string
}

export type DraftRestoreAttempt = 'restored' | 'failed' | 'missing'

export interface RestoreFlowNotifications {
  announcePolite: (message: string) => void
  announceAssertive: (message: string) => void
  setEditorMessage: (message: string) => void
  setRestoreOutcome: (outcome: RestoreOutcome) => void
  toastSuccess: (message: string) => void
  toastWarning: (message: string) => void
  toastError: (message: string) => void
}

export interface InvalidRestoreCase {
  editorMessage: string
  assertiveMessage: string
  toastMessage: string
}

export type SelectionAnnouncementMode =
  | 'default'
  | 'suppress'
  | 'added'
  | 'canvas-keyboard'
  | 'panel-keyboard'

export interface PendingSelectionChangeBehavior {
  announceMode: SelectionAnnouncementMode
  requestOutlinerFocus: boolean
}
