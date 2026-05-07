import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { StartupErrorKind } from './use-startup-state'

interface InitializationErrorProps {
  errorKind: StartupErrorKind | null
  errorMessage: string | null
  onRetry: () => void
}

function getErrorCopy(
  errorKind: StartupErrorKind | null,
  errorMessage: string | null,
) {
  if (errorKind === 'manifest-timeout') {
    return {
      label: 'Catalog request timed out',
      description:
        'The furniture catalog request timed out before startup completed.',
      note: 'Check your connection and retry loading the catalog.',
    }
  }

  if (errorKind === 'manifest-network') {
    return {
      label: 'Catalog request failed',
      description:
        'The editor could not download the furniture catalog required to start.',
      note: 'Check your connection and retry loading the catalog.',
    }
  }

  if (errorKind === 'manifest-validation') {
    return {
      label: 'Catalog data is invalid',
      description:
        'The furniture catalog was fetched but failed validation checks.',
      note: 'Confirm the manifest schema and asset paths, then retry.',
    }
  }

  if (errorKind === 'asset-load') {
    return {
      label: 'Asset loading failed',
      description:
        'A required furniture model did not load correctly, so editor interactions are temporarily unavailable.',
      note: 'Retry to request the essential assets again.',
    }
  }

  return {
    label: 'Startup failed',
    description:
      errorMessage ??
      'The room editor could not start due to an unexpected startup error.',
    note: 'Retry to attempt startup again.',
  }
}

export function InitializationError({
  errorKind,
  errorMessage,
  onRetry,
}: InitializationErrorProps) {
  const retryButtonRef = useRef<HTMLButtonElement | null>(null)
  const copy = getErrorCopy(errorKind, errorMessage)

  useEffect(() => {
    retryButtonRef.current?.focus()
  }, [])

  return (
    <section
      className="absolute inset-0 grid place-items-center bg-background/75 p-6 max-[720px]:p-4"
      aria-live="assertive"
    >
      <Card
        className="w-[min(26.25rem,calc(100vw-2rem))] gap-3 border-destructive/25 shadow-xl"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="startup-error-title"
        aria-describedby="startup-error-description startup-error-note"
      >
        <CardContent className="grid gap-3 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.04em] text-muted-foreground">
            {copy.label}
          </p>
          <h2
            id="startup-error-title"
            className="text-2xl font-semibold leading-tight"
          >
            The room editor could not start
          </h2>
          <p
            id="startup-error-description"
            className="text-sm leading-relaxed text-foreground"
          >
            {copy.description}
          </p>
          <p
            id="startup-error-note"
            className="text-sm leading-relaxed text-destructive"
          >
            {copy.note}
          </p>
          <div className="flex justify-start">
            <Button
              ref={retryButtonRef}
              type="button"
              variant="outline"
              onClick={onRetry}
            >
              Retry Loading
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
