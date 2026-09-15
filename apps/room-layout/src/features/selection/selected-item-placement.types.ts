import type { ToolbarFloatingCandidateId } from './toolbar-placement/selected-toolbar-placement'

interface SelectedItemFloatingPlacement {
  site: 'floating'
  candidateId: ToolbarFloatingCandidateId
  left: number
  top: number
}

interface SelectedItemHiddenPlacement {
  site: 'hidden'
  reason: 'no-selection' | 'computed-hidden'
}

export type SelectedItemPlacement =
  | SelectedItemFloatingPlacement
  | SelectedItemHiddenPlacement
