import {
  DescriptionDetail,
  DescriptionList,
  DescriptionTerm,
} from '@/shared/ui/description-list'
import type { MessageDescriptor } from '@lingui/core'
import { msg } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import { Fragment, useId } from 'react'
import attributions from './asset-attributions.json'

interface AttributionContributor {
  label: string
  name: string
  href: string
}

// The attributions JSON stores contributor roles as English labels; they are UI
// vocabulary (unlike the proper names beside them), so map them to catalog
// descriptors here. An unknown label falls back to its raw JSON text.
const CONTRIBUTOR_LABELS: Record<string, MessageDescriptor> = {
  Author: msg`Author`,
  Photographer: msg`Photographer`,
  Processing: msg`Processing`,
}

interface AssetAttributionProps {
  assetName: string
  contributors: AttributionContributor[]
  sourceName: string
  sourceHref: string
  licenseName: string
  licenseHref: string
  localSourcePath: string
}

function ExternalLink({
  href,
  children,
}: {
  href: string
  children: React.ReactNode
}) {
  return (
    <a
      className="underline decoration-1 underline-offset-3"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
    >
      {children} <span aria-hidden>↗</span>
    </a>
  )
}

function AssetAttribution({
  assetName,
  contributors,
  sourceName,
  sourceHref,
  licenseName,
  licenseHref,
  localSourcePath,
}: AssetAttributionProps) {
  const { i18n } = useLingui()
  const id = useId()
  // No bg tint on the card: DescriptionTerm's muted text needs the dialog
  // background to keep WCAG AA contrast (the border alone delineates it).
  return (
    <section
      className="grid gap-2 rounded-lg border border-border/90 p-3"
      aria-labelledby={id}
    >
      <h4
        className="m-0 text-sm font-bold leading-tight text-foreground"
        id={id}
      >
        {assetName}
      </h4>
      <DescriptionList>
        {contributors.map((contributor) => (
          <Fragment key={`${contributor.label}:${contributor.name}`}>
            <DescriptionTerm>
              {contributor.label in CONTRIBUTOR_LABELS
                ? i18n._(CONTRIBUTOR_LABELS[contributor.label])
                : contributor.label}
            </DescriptionTerm>
            <DescriptionDetail>
              <ExternalLink href={contributor.href}>
                {contributor.name}
              </ExternalLink>
            </DescriptionDetail>
          </Fragment>
        ))}
        <DescriptionTerm>
          <Trans>Source</Trans>
        </DescriptionTerm>
        <DescriptionDetail>
          <ExternalLink href={sourceHref}>{sourceName}</ExternalLink>
        </DescriptionDetail>
        <DescriptionTerm>
          <Trans>License</Trans>
        </DescriptionTerm>
        <DescriptionDetail>
          <ExternalLink href={licenseHref}>{licenseName}</ExternalLink>
        </DescriptionDetail>
        <DescriptionTerm>
          <Trans>Notes/Modifications</Trans>
        </DescriptionTerm>
        <DescriptionDetail>
          <ExternalLink
            href={`https://github.com/christopher-r-anderson/room-layout/blob/main/${localSourcePath}`}
          >
            {localSourcePath}
          </ExternalLink>
        </DescriptionDetail>
      </DescriptionList>
    </section>
  )
}

export function AssetAttributionList() {
  return (
    <div className="grid gap-3">
      {attributions.map((entry) => (
        <AssetAttribution key={entry.assetName} {...entry} />
      ))}
    </div>
  )
}
