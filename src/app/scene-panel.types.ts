export interface SceneOutlinerFocusRequest {
  token: number
  preferredIndex?: number
  targetSelectedId?: string | null
  focusContainer?: boolean
}
