function isTextInputTag(tagName: string | undefined): boolean {
  if (!tagName) {
    return false
  }

  return tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT'
}

export function isTextInputLikeTagName(tagName: string | undefined): boolean {
  return isTextInputTag(tagName)
}

export function isContentEditableTarget(target: HTMLElement): boolean {
  const contentEditableAttr = target.getAttribute('contenteditable')
  return (
    target.isContentEditable ||
    contentEditableAttr === '' ||
    contentEditableAttr === 'true'
  )
}

export function isEditingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  return isContentEditableTarget(target) || isTextInputTag(target.tagName)
}

export function isDialogTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  return target.closest('[role="dialog"], [role="alertdialog"]') !== null
}
