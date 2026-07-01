import { useEffect, useRef } from 'react'
import type { I18n } from '@lingui/core'
import { msg } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import { Button } from '@/shared/ui/button'
import { Caption } from '@/shared/ui/caption'
import { Card, CardContent } from '@/shared/ui/card'
import { requestAssetRetry } from '@/core/operations/startup-coordinator'
import type { StartupErrorKind } from './startup.types'

interface InitializationErrorProps {
  errorKind: StartupErrorKind | null
  errorMessage: string | null
}

function getErrorCopy(
  i18n: I18n,
  errorKind: StartupErrorKind | null,
  errorMessage: string | null,
) {
  if (errorKind === 'manifest-timeout') {
    return {
      label: i18n._(msg`Catalog request timed out`),
      description: i18n._(
        msg`The furniture catalog request timed out before startup completed.`,
      ),
      note: i18n._(msg`Check your connection and retry loading the catalog.`),
    }
  }

  if (errorKind === 'manifest-network') {
    return {
      label: i18n._(msg`Catalog request failed`),
      description: i18n._(
        msg`The editor could not download the furniture catalog required to start.`,
      ),
      note: i18n._(msg`Check your connection and retry loading the catalog.`),
    }
  }

  if (errorKind === 'manifest-validation') {
    return {
      label: i18n._(msg`Catalog data is invalid`),
      description: i18n._(
        msg`The furniture catalog was fetched but failed validation checks.`,
      ),
      note: i18n._(
        msg`Confirm the manifest schema and asset paths, then retry.`,
      ),
    }
  }

  if (errorKind === 'asset-load') {
    return {
      label: i18n._(msg`Asset loading failed`),
      description: i18n._(
        msg`A required furniture model did not load correctly, so editor interactions are temporarily unavailable.`,
      ),
      note: i18n._(msg`Retry to request the essential assets again.`),
    }
  }

  return {
    label: i18n._(msg`Startup failed`),
    description:
      errorMessage ??
      i18n._(
        msg`The room editor could not start due to an unexpected startup error.`,
      ),
    note: i18n._(msg`Retry to attempt startup again.`),
  }
}

export function InitializationError({
  errorKind,
  errorMessage,
}: InitializationErrorProps) {
  // Subscribe to locale changes so the error copy re-resolves when a non-default
  // locale activates after this overlay has mounted.
  const { i18n } = useLingui()
  const retryButtonRef = useRef<HTMLButtonElement | null>(null)
  const copy = getErrorCopy(i18n, errorKind, errorMessage)

  useEffect(() => {
    retryButtonRef.current?.focus()
  }, [])

  return (
    <section className="absolute inset-0 grid place-items-center bg-background/75 p-6 max-[720px]:p-4">
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
    </section>
  )
}
