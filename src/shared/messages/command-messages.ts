import { msg } from '@lingui/core/macro'
import type { MessageDescriptor } from '@lingui/core'

// Command failure messages as Lingui descriptors. Callers resolve them with
// `i18n._(...)` at the point of use so they reflect the active locale rather than
// freezing to whatever was active at module load.
export const ADD_FURNITURE_NO_SPACE_MESSAGE: MessageDescriptor = msg`No safe placement slot is available for that furniture item.`

export const ADD_FURNITURE_UNKNOWN_CATALOG_MESSAGE: MessageDescriptor = msg`The selected furniture entry is no longer available.`

export const ADD_FURNITURE_LOAD_FAILED_MESSAGE: MessageDescriptor = msg`Couldn't load that item. Check your connection and try again.`

export const ADD_FURNITURE_UNAVAILABLE_MESSAGE: MessageDescriptor = msg`That item isn't available right now.`

export const ADD_FURNITURE_WHILE_DRAGGING_MESSAGE: MessageDescriptor = msg`Finish dragging before adding furniture.`

export const DELETE_SELECTION_MISSING_MESSAGE: MessageDescriptor = msg`No selected furniture item was available to delete.`

export const NO_SELECTION_FOCUS_FALLBACK_MESSAGE: MessageDescriptor = msg`No item selected. Focus moved to Furniture in room.`

export const NO_SELECTION_FOCUS_UNAVAILABLE_MESSAGE: MessageDescriptor = msg`No item selected.`

export const FURNITURE_LIST_UNAVAILABLE_MESSAGE: MessageDescriptor = msg`The furniture list is not available in this layout.`
