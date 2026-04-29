interface FurnitureOutlinerItem {
  id: string
  label: string
  selected: boolean
}

export function FurnitureOutliner({
  descriptionId,
  items,
  onSelect,
}: {
  descriptionId: string
  items: FurnitureOutlinerItem[]
  onSelect: (id: string) => void
}) {
  return (
    <section
      aria-labelledby="furniture-in-room-heading"
      className="rounded-md bg-muted/70 p-2"
    >
      <h2 id="furniture-in-room-heading" className="text-sm font-medium">
        Furniture in room
      </h2>

      {items.length === 0 ? (
        <p className="mt-1 text-xs/relaxed text-muted-foreground" role="status">
          No furniture in room yet.
        </p>
      ) : (
        <ul aria-describedby={descriptionId} className="mt-2 space-y-1">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                aria-current={item.selected ? 'true' : undefined}
                className="w-full rounded-sm px-2 py-1 text-left text-xs/relaxed hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                onClick={() => {
                  onSelect(item.id)
                }}
              >
                {item.label}
                {item.selected ? ' — selected' : ''}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export type { FurnitureOutlinerItem }
