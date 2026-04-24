import { parseAriaShortcuts } from '@/lib/utils'
import React from 'react'
import { Kbd, KbdGroup } from './kbd'

export function KbdShortcutDisplay({
  shortcuts,
}: {
  shortcuts: string | null | undefined
}) {
  const parsed = parseAriaShortcuts(shortcuts)

  return (
    <>
      {parsed.map((shortcutKeys, sIndex) => {
        const isSingleKey = shortcutKeys.length === 1
        const shortcutElement = isSingleKey ? (
          <Kbd>{shortcutKeys[0]}</Kbd>
        ) : (
          <KbdGroup>
            {shortcutKeys.map((key, kIndex) => (
              <React.Fragment key={kIndex}>
                <Kbd>{key}</Kbd>
                {kIndex < shortcutKeys.length - 1 && <span>+</span>}
              </React.Fragment>
            ))}
          </KbdGroup>
        )

        return (
          <React.Fragment key={sIndex}>
            {sIndex > 0 && <span> or </span>}
            {shortcutElement}
          </React.Fragment>
        )
      })}
    </>
  )
}
