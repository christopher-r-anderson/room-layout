import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  runStartupRestoreFlow,
  selectPrimaryRestoreState,
  validateDraftState,
} from './restore-flow'
import { feedback } from '@/core/stores/feedback-store'
import { editorLifecycleActions } from '@/core/stores/editor-lifecycle-store'
import type { FurnitureCatalogEntry } from '@/domain/catalog'

function createCatalogEntry(id: string): FurnitureCatalogEntry {
  return {
    id,
    name: `Item ${id}`,
    kind: 'armchair',
    collectionId: 'collection-1',
    nodeName: 'node-1',
    footprintSize: { width: 1, depth: 1 },
    previewPath: '/preview.png',
  }
}

function createState(id: string) {
  return {
    items: [
      {
        id: `${id}-instance-1`,
        catalogId: id,
        position: [0, 0, 0] as [number, number, number],
        rotationY: 0,
      },
    ],
    floorFinishId: 'floor-1',
    wallFinishId: 'wall-1',
  }
}

afterEach(() => {
  vi.restoreAllMocks()
})

// The flow reports through the real modules; spies keep the tests pure.
function createFeedbackSpies() {
  const noop = () => undefined

  return {
    setRestoreOutcome: vi
      .spyOn(editorLifecycleActions, 'recordRestoreOutcome')
      .mockImplementation(noop),
    actionSuccess: vi.spyOn(feedback, 'actionSuccess').mockImplementation(noop),
    actionWarning: vi.spyOn(feedback, 'actionWarning').mockImplementation(noop),
    actionError: vi.spyOn(feedback, 'actionError').mockImplementation(noop),
  }
}

describe('runStartupRestoreFlow', () => {
  it('restores from valid scene param and reports success channels', () => {
    const parsed = createState('chair-1')
    const catalog = [createCatalogEntry('chair-1')]
    const applyState = vi.fn()
    const calls = createFeedbackSpies()

    runStartupRestoreFlow({
      parseResult: { ok: true, ...parsed },
      catalog,
      validDraftState: null,
      applyState,
    })

    expect(applyState).toHaveBeenCalledWith({ ok: true, ...parsed })
    expect(calls.setRestoreOutcome).toHaveBeenCalledWith('restored')
    expect(calls.actionSuccess).toHaveBeenCalledTimes(1)
    expect(calls.actionSuccess).toHaveBeenCalledWith({
      title: 'Room layout restored from shared link.',
    })
    expect(calls.actionWarning).not.toHaveBeenCalled()
    expect(calls.actionError).not.toHaveBeenCalled()
  })

  it('falls back to valid draft when parsed scene restore throws', () => {
    const parsed = createState('chair-1')
    const draft = createState('chair-1')
    const catalog = [createCatalogEntry('chair-1')]
    const applyState = vi
      .fn<(state: { items: unknown[] }) => void>()
      .mockImplementationOnce(() => {
        throw new Error('parsed restore failed')
      })
      .mockImplementationOnce(() => undefined)
    const calls = createFeedbackSpies()

    runStartupRestoreFlow({
      parseResult: { ok: true, ...parsed },
      catalog,
      validDraftState: draft,
      applyState,
    })

    expect(applyState).toHaveBeenCalledTimes(2)
    expect(applyState).toHaveBeenNthCalledWith(2, draft)
    expect(calls.setRestoreOutcome).toHaveBeenCalledWith('invalid')
    expect(calls.actionWarning).toHaveBeenCalledTimes(1)
    // The link parsed and validated but failed to apply, so the wording must
    // not claim the link "was invalid".
    expect(calls.actionWarning).toHaveBeenCalledWith({
      title: 'Shared link could not be restored. Recovered your local draft.',
    })
    expect(calls.actionSuccess).not.toHaveBeenCalled()
    expect(calls.actionError).not.toHaveBeenCalled()
  })

  it('reports one blocking error when both the shared link and the draft fail to apply', () => {
    const parsed = createState('chair-1')
    const draft = createState('chair-1')
    const catalog = [createCatalogEntry('chair-1')]
    const applyState = vi.fn(() => {
      throw new Error('restore failed')
    })
    const calls = createFeedbackSpies()

    runStartupRestoreFlow({
      parseResult: { ok: true, ...parsed },
      catalog,
      validDraftState: draft,
      applyState,
    })

    expect(calls.setRestoreOutcome).toHaveBeenCalledWith('invalid')
    expect(calls.actionError).toHaveBeenCalledTimes(1)
    expect(calls.actionError).toHaveBeenCalledWith({
      title: 'Shared link and draft could not be restored.',
      description: 'Starting with an empty room.',
    })
    expect(calls.actionSuccess).not.toHaveBeenCalled()
    expect(calls.actionWarning).not.toHaveBeenCalled()
  })

  it('reports blocking error when scene param is malformed and no draft exists', () => {
    const catalog = [createCatalogEntry('chair-1')]
    const applyState = vi.fn()
    const calls = createFeedbackSpies()

    runStartupRestoreFlow({
      parseResult: { ok: false, reason: 'decode-error' },
      catalog,
      validDraftState: null,
      applyState,
    })

    expect(applyState).not.toHaveBeenCalled()
    expect(calls.setRestoreOutcome).toHaveBeenCalledWith('invalid')
    expect(calls.actionError).toHaveBeenCalledTimes(1)
    expect(calls.actionError).toHaveBeenCalledWith({
      title: 'Shared link could not be restored.',
      description: 'Starting with an empty room.',
    })
    expect(calls.actionSuccess).not.toHaveBeenCalled()
    expect(calls.actionWarning).not.toHaveBeenCalled()
  })

  it('falls back to draft when parsed scene has unknown catalog IDs', () => {
    const parsed = createState('unknown-catalog-id')
    const draft = createState('chair-1')
    const catalog = [createCatalogEntry('chair-1')]
    const applyState = vi.fn()
    const calls = createFeedbackSpies()

    runStartupRestoreFlow({
      parseResult: { ok: true, ...parsed },
      catalog,
      validDraftState: draft,
      applyState,
    })

    expect(applyState).toHaveBeenCalledTimes(1)
    expect(applyState).toHaveBeenCalledWith(draft)
    expect(calls.setRestoreOutcome).toHaveBeenCalledWith('invalid')
    expect(calls.actionWarning).toHaveBeenCalledTimes(1)
    expect(calls.actionWarning).toHaveBeenCalledWith({
      title: 'Shared link contained unknown furniture. Draft restored.',
    })
    expect(calls.actionSuccess).not.toHaveBeenCalled()
    expect(calls.actionError).not.toHaveBeenCalled()
  })

  it('restores no-param non-empty draft and reports skipped outcome with a success notice', () => {
    const draft = createState('chair-1')
    const catalog = [createCatalogEntry('chair-1')]
    const applyState = vi.fn()
    const calls = createFeedbackSpies()

    runStartupRestoreFlow({
      parseResult: { ok: false, reason: 'no-param' },
      catalog,
      validDraftState: draft,
      applyState,
      isFreshState: () => false,
    })

    expect(applyState).toHaveBeenCalledWith(draft)
    expect(calls.actionSuccess).toHaveBeenCalledTimes(1)
    expect(calls.actionSuccess).toHaveBeenCalledWith({
      title: 'Restored your saved draft.',
    })
    expect(calls.setRestoreOutcome).toHaveBeenLastCalledWith('skipped')
  })

  it('keeps empty no-param draft restore silent except skipped outcome', () => {
    const emptyDraft = {
      items: [] as {
        id: string
        catalogId: string
        position: [number, number, number]
        rotationY: number
      }[],
      floorFinishId: 'floor-1',
      wallFinishId: 'wall-1',
    }
    const catalog = [createCatalogEntry('chair-1')]
    const applyState = vi.fn()
    const calls = createFeedbackSpies()

    runStartupRestoreFlow({
      parseResult: { ok: false, reason: 'no-param' },
      catalog,
      validDraftState: emptyDraft,
      applyState,
      isFreshState: () => true,
    })

    expect(applyState).toHaveBeenCalledWith(emptyDraft)
    expect(calls.actionSuccess).not.toHaveBeenCalled()
    expect(calls.actionWarning).not.toHaveBeenCalled()
    expect(calls.actionError).not.toHaveBeenCalled()
    expect(calls.setRestoreOutcome).toHaveBeenLastCalledWith('skipped')
  })

  it('keeps invalid outcome when no-param draft restore throws', () => {
    const draft = createState('chair-1')
    const catalog = [createCatalogEntry('chair-1')]
    const applyState = vi.fn(() => {
      throw new Error('draft restore failed')
    })
    const calls = createFeedbackSpies()

    runStartupRestoreFlow({
      parseResult: { ok: false, reason: 'no-param' },
      catalog,
      validDraftState: draft,
      applyState,
      isFreshState: () => false,
    })

    expect(calls.setRestoreOutcome).toHaveBeenCalledWith('invalid')
    expect(calls.setRestoreOutcome).not.toHaveBeenCalledWith('skipped')
    expect(calls.actionError).toHaveBeenCalledTimes(1)
    expect(calls.actionError).toHaveBeenCalledWith({
      title: 'Draft could not be restored.',
      description: 'Starting with an empty room.',
    })
    expect(calls.actionSuccess).not.toHaveBeenCalled()
    expect(calls.actionWarning).not.toHaveBeenCalled()
  })

  it('keeps no-param draft restore silent when finishes match defaults even without furniture check', () => {
    const draft = {
      items: [
        {
          id: 'chair-instance-1',
          catalogId: 'chair-1',
          position: [0, 0, 0] as [number, number, number],
          rotationY: 0,
        },
      ],
      floorFinishId: 'wood-floor',
      wallFinishId: 'light-gray',
    }
    const catalog = [createCatalogEntry('chair-1')]
    const applyState = vi.fn()
    const calls = createFeedbackSpies()

    runStartupRestoreFlow({
      parseResult: { ok: false, reason: 'no-param' },
      catalog,
      validDraftState: draft,
      isFreshState: () => true,
      applyState,
    })

    expect(applyState).toHaveBeenCalledWith(draft)
    expect(calls.actionSuccess).not.toHaveBeenCalled()
    expect(calls.actionWarning).not.toHaveBeenCalled()
    expect(calls.actionError).not.toHaveBeenCalled()
    expect(calls.setRestoreOutcome).toHaveBeenLastCalledWith('skipped')
  })
})

describe('selectPrimaryRestoreState', () => {
  const catalog = [createCatalogEntry('chair-1')]

  it('selects a valid shared link over a valid draft', () => {
    const parsed = createState('chair-1')
    const selection = selectPrimaryRestoreState({
      parseResult: { ok: true, ...parsed },
      validDraftState: createState('chair-1'),
      catalog,
    })

    expect(selection.source).toBe('link')
    expect(selection.state).toMatchObject({ items: parsed.items })
  })

  it('falls back to the draft when the link references unknown furniture', () => {
    const selection = selectPrimaryRestoreState({
      parseResult: { ok: true, ...createState('unknown-id') },
      validDraftState: createState('chair-1'),
      catalog,
    })

    expect(selection.source).toBe('draft')
  })

  it('selects nothing when there is no link and no draft', () => {
    const selection = selectPrimaryRestoreState({
      parseResult: { ok: false, reason: 'no-param' },
      validDraftState: null,
      catalog,
    })

    expect(selection).toEqual({ source: 'none', state: null })
  })
})

describe('validateDraftState', () => {
  it('passes a draft whose references are known and rejects one that is not', () => {
    const catalog = [createCatalogEntry('chair-1')]
    const validDraft = createState('chair-1')

    expect(validateDraftState(validDraft, catalog)).toBe(validDraft)
    expect(validateDraftState(createState('unknown-id'), catalog)).toBeNull()
    expect(validateDraftState(null, catalog)).toBeNull()
  })
})
