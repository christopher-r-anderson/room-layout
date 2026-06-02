import type { ToolbarFloatingCandidateId } from '@/lib/ui/selected-toolbar-placement'

export type SelectedItemPlacementSite = 'docked' | 'floating' | 'hidden'

export type SelectedItemDockedReason =
  | 'mobile-layout'
  | 'no-geometry'
  | 'low-confidence'
  | 'forced'

export interface SelectedItemFloatingPlacement {
  site: 'floating'
  candidateId: ToolbarFloatingCandidateId
  left: number
  top: number
}

export interface SelectedItemDockedPlacement {
  site: 'docked'
  reason: SelectedItemDockedReason
  left: number
  top: number
}

export interface SelectedItemHiddenPlacement {
  site: 'hidden'
  reason: 'no-selection' | 'computed-hidden'
}

export type SelectedItemPlacement =
  | SelectedItemFloatingPlacement
  | SelectedItemDockedPlacement
  | SelectedItemHiddenPlacement
