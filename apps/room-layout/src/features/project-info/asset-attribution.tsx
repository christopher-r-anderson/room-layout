import {
  DescriptionDetail,
  DescriptionList,
  DescriptionTerm,
} from '@/shared/ui/description-list'
import type { MessageDescriptor } from '@lingui/core'
import { msg } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import { Fragment } from 'react'
import attributions from './asset-attributions.json'
import type { ReactNode } from 'react'

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
  children: ReactNode
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
  // No bg tint on the card: DescriptionTerm's muted text needs the dialog
  // background to keep WCAG AA contrast (the border alone delineates it).
  return (
    <li className="grid gap-2 rounded-lg border border-border/90 p-3">
      <h4 className="m-0 text-sm font-bold leading-tight text-foreground">
        {assetName}
      </h4>
      <DescriptionList>
        {contributors.map((contributor) => (
          <Fragment key={`${contributor.label}:${contributor.name}`}>
            <DescriptionTerm>
              {Object.hasOwn(CONTRIBUTOR_LABELS, contributor.label)
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
    </li>
  )
}

export function AssetAttributionList() {
  return (
    // Explicit role: `list-none` styling strips list semantics in Safari/VoiceOver.
    <ul role="list" className="grid list-none gap-3 p-0">
      {attributions.map((entry) => (
        <AssetAttribution key={entry.assetName} {...entry} />
      ))}
    </ul>
  )
}
