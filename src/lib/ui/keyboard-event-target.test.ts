// @vitest-environment jsdom

import { describe, expect, it } from 'vitest'
import {
  isContentEditableTarget,
  isDialogTarget,
  isEditingTarget,
  isTextInputLikeTagName,
} from './keyboard-event-target'

describe('keyboard-event-target', () => {
  it('identifies input-like tag names', () => {
    expect(isTextInputLikeTagName('INPUT')).toBe(true)
    expect(isTextInputLikeTagName('TEXTAREA')).toBe(true)
    expect(isTextInputLikeTagName('SELECT')).toBe(true)
    expect(isTextInputLikeTagName('DIV')).toBe(false)
    expect(isTextInputLikeTagName(undefined)).toBe(false)
  })

  it('identifies contenteditable targets via attribute states', () => {
    const div = document.createElement('div')
    div.setAttribute('contenteditable', 'true')
    expect(isContentEditableTarget(div)).toBe(true)

    const explicitAttr = document.createElement('div')
    explicitAttr.setAttribute('contenteditable', '')
    expect(isContentEditableTarget(explicitAttr)).toBe(true)

    const nonEditable = document.createElement('div')
    expect(isContentEditableTarget(nonEditable)).toBe(false)
  })

  it('identifies editing event targets', () => {
    const input = document.createElement('input')
    expect(isEditingTarget(input)).toBe(true)

    const editable = document.createElement('div')
    editable.setAttribute('contenteditable', 'true')
    expect(isEditingTarget(editable)).toBe(true)

    const button = document.createElement('button')
    expect(isEditingTarget(button)).toBe(false)
    expect(isEditingTarget(null)).toBe(false)
  })

  it('identifies event targets within dialog landmarks', () => {
    const dialog = document.createElement('div')
    dialog.setAttribute('role', 'dialog')
    const button = document.createElement('button')
    dialog.appendChild(button)
    document.body.appendChild(dialog)

    expect(isDialogTarget(button)).toBe(true)

    const alertDialog = document.createElement('div')
    alertDialog.setAttribute('role', 'alertdialog')
    const alertButton = document.createElement('button')
    alertDialog.appendChild(alertButton)
    document.body.appendChild(alertDialog)

    expect(isDialogTarget(alertButton)).toBe(true)

    const outside = document.createElement('button')
    document.body.appendChild(outside)

    expect(isDialogTarget(outside)).toBe(false)
  })
})
