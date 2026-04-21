import { useId } from 'react'

interface AssetAttributionProps {
  assetName: string
  authorHref: string
  authorName: string
  sourceHref: string
  localSourcePath: string
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
    <section className="info-dialog-subsection" aria-labelledby={id}>
      <h4 className="info-dialog-subheading" id={id}>
        {assetName}
      </h4>
      <dl className="info-dialog-definition-list">
        <dt>Author</dt>
        <dd>
          <a href={authorHref} target="_blank" rel="noopener noreferrer">
            {authorName} <span aria-hidden>↗</span>
          </a>
        </dd>
        <dt>Source</dt>
        <dd>
          <a href={sourceHref} target="_blank" rel="noopener noreferrer">
            Sketchfab <span aria-hidden>↗</span>
          </a>
        </dd>
        <dt>License</dt>
        <dd>
          <a
            href="https://creativecommons.org/licenses/by/4.0/deed.en"
            target="_blank"
            rel="noopener noreferrer"
          >
            CC BY 4.0 <span aria-hidden>↗</span>
          </a>
        </dd>
        <dt>Notes/Modifications</dt>
        <dd>
          <a
            href={`https://github.com/christopher-r-anderson/room-layout/blob/main/${localSourcePath}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {localSourcePath} <span aria-hidden>↗</span>
          </a>
        </dd>
      </dl>
    </section>
  )
}
