import type { ComponentPropsWithoutRef, ReactNode, RefObject } from 'react'

export function OverlayControlPanel({
  ariaLabel,
  children,
}: {
  ariaLabel: string
  children: ReactNode
}) {
  return (
    <section className="catalog-controls" aria-label={ariaLabel}>
      {children}
    </section>
  )
}

export function OverlayControlSection({
  children,
  className,
  heading,
  headingId,
}: {
  children: ReactNode
  className?: string
  heading: string
  headingId?: string
}) {
  const sectionClassName = className
    ? `control-group ${className}`
    : 'control-group'

  return (
    <div className={sectionClassName} aria-labelledby={headingId}>
      <h2 id={headingId} className="control-heading">
        {heading}
      </h2>
      {children}
    </div>
  )
}

export function OverlayToolbar({
  ariaLabel,
  children,
  className,
}: {
  ariaLabel: string
  children: ReactNode
  className: string
}) {
  return (
    <div className={className} role="toolbar" aria-label={ariaLabel}>
      {children}
    </div>
  )
}

export function OverlayStatusMessage({ message }: { message: string | null }) {
  if (!message) {
    return null
  }

  return (
    <p className="editor-message" role="status">
      {message}
    </p>
  )
}

export function OverlayIconButton({
  buttonRef,
  children,
  ...buttonProps
}: {
  buttonRef?: RefObject<HTMLButtonElement | null>
  children: ReactNode
} & ComponentPropsWithoutRef<'button'>) {
  return (
    <button
      ref={buttonRef}
      type="button"
      className="info-button"
      {...buttonProps}
    >
      {children}
    </button>
  )
}
