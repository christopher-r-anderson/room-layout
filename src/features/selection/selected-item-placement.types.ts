import type { ToolbarFloatingCandidateId } from './selected-toolbar-placement'

export type SelectedItemDockedReason =
  | 'mobile-layout'
  | 'no-geometry'
  | 'low-confidence'
  | 'forced'

interface SelectedItemFloatingPlacement {
  site: 'floating'
  candidateId: ToolbarFloatingCandidateId
  left: number
  top: number
}

interface SelectedItemDockedPlacement {
  site: 'docked'
  reason: SelectedItemDockedReason
  left: number
  top: number
}

interface SelectedItemHiddenPlacement {
  site: 'hidden'
  reason: 'no-selection' | 'computed-hidden'
}

export type SelectedItemPlacement =
  | SelectedItemFloatingPlacement
  | SelectedItemDockedPlacement
  | SelectedItemHiddenPlacement
