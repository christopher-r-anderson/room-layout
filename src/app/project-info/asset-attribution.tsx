import {
  DescriptionDetail,
  DescriptionList,
  DescriptionTerm,
} from '@/components/ui/description-list'
import { useId } from 'react'
import attributions from './asset-attributions.json'

interface AssetAttributionProps {
  assetName: string
  authorHref: string
  authorName: string
  sourceHref: string
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

export function AssetAttribution({
  assetName,
  authorHref,
  authorName,
  sourceHref,
  localSourcePath,
}: AssetAttributionProps) {
  const id = useId()
  return (
    <section
      className="grid gap-2 rounded-lg border border-border/90 bg-muted/35 p-3"
      aria-labelledby={id}
    >
      <h4
        className="m-0 text-sm font-bold leading-tight text-foreground"
        id={id}
      >
        {assetName}
      </h4>
      <DescriptionList>
        <DescriptionTerm>Author</DescriptionTerm>
        <DescriptionDetail>
          <ExternalLink href={authorHref}>{authorName}</ExternalLink>
        </DescriptionDetail>
        <DescriptionTerm>Source</DescriptionTerm>
        <DescriptionDetail>
          <ExternalLink href={sourceHref}>Sketchfab</ExternalLink>
        </DescriptionDetail>
        <DescriptionTerm>License</DescriptionTerm>
        <DescriptionDetail>
          <ExternalLink href="https://creativecommons.org/licenses/by/4.0/deed.en">
            CC BY 4.0
          </ExternalLink>
        </DescriptionDetail>
        <DescriptionTerm>Notes/Modifications</DescriptionTerm>
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
