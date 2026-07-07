import { useEffect, useRef } from 'react'
import type { MessageDescriptor } from '@lingui/core'
import { msg } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import { Button } from '@/shared/ui/button'
import { Caption } from '@/shared/ui/caption'
import { Card, CardContent } from '@/shared/ui/card'
import { requestAssetRetry } from '@/core/operations/startup-coordinator'
import type { StartupErrorKind } from '@/core/stores/editor-lifecycle-store'

interface InitializationErrorProps {
  errorKind: StartupErrorKind | null
  errorMessage: string | null
}

interface ErrorCopy {
  label: MessageDescriptor
  description: MessageDescriptor
  note: MessageDescriptor
}

const ERROR_COPY: Record<StartupErrorKind, ErrorCopy> = {
  'manifest-timeout': {
    label: msg`Catalog request timed out`,
    description: msg`The furniture catalog request timed out before startup completed.`,
    note: msg`Check your connection and retry loading the catalog.`,
  },
  'manifest-network': {
    label: msg`Catalog request failed`,
    description: msg`The editor could not download the furniture catalog required to start.`,
    note: msg`Check your connection and retry loading the catalog.`,
  },
  'manifest-validation': {
    label: msg`Catalog data is invalid`,
    description: msg`The furniture catalog was fetched but failed validation checks.`,
    note: msg`Confirm the manifest schema and asset paths, then retry.`,
  },
  'asset-load': {
    label: msg`Asset loading failed`,
    description: msg`A required furniture model did not load correctly, so editor interactions are temporarily unavailable.`,
    note: msg`Retry to request the essential assets again.`,
  },
  'app-chunk': {
    label: msg`Editor failed to load`,
    description: msg`Part of the editor's code did not load. This can happen after an update or a dropped connection.`,
    note: msg`Retry to reload the editor.`,
  },
}

// Fallback for an error with no classified kind; a caller-provided message
// (already human-readable) takes precedence over the generic description.
const UNKNOWN_ERROR_COPY: ErrorCopy = {
  label: msg`Startup failed`,
  description: msg`The room editor could not start due to an unexpected startup error.`,
  note: msg`Retry to attempt startup again.`,
}

export function InitializationError({
  errorKind,
  errorMessage,
}: InitializationErrorProps) {
  const { i18n } = useLingui()
  const retryButtonRef = useRef<HTMLButtonElement | null>(null)
  const errorCopy = errorKind ? ERROR_COPY[errorKind] : UNKNOWN_ERROR_COPY
  const copy = {
    label: i18n._(errorCopy.label),
    description:
      (errorKind ? null : errorMessage) ?? i18n._(errorCopy.description),
    note: i18n._(errorCopy.note),
  }

  useEffect(() => {
    retryButtonRef.current?.focus()
  }, [])

  return (
    <div className="absolute inset-0 grid place-items-center bg-background/75 p-6 max-[720px]:p-4">
      <Card
        className="w-[min(26.25rem,calc(100vw-2rem))] gap-3 border-destructive/25"
        role="alert"
        aria-labelledby="startup-error-title"
        aria-describedby="startup-error-description startup-error-note"
      >
        <CardContent className="grid gap-3 p-5">
          <Caption>{copy.label}</Caption>
          <h2
            id="startup-error-title"
            className="text-2xl font-semibold leading-tight"
          >
            <Trans>The room editor could not start</Trans>
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
              onClick={requestAssetRetry}
            >
              <Trans>Retry Loading</Trans>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
