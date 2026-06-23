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
