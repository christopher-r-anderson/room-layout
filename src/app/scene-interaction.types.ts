export type InteractionSource =
  | 'canvas-keyboard'
  | 'canvas-pointer'
  | 'panel-keyboard'
  | 'panel-pointer'
  | 'toolbar'
  | null

export type PanelInteractionSource = 'panel-keyboard' | 'panel-pointer'

export type PanelSelectById = (
  id: string,
  source: PanelInteractionSource,
) => void
