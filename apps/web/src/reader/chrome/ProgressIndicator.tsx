/**
 * Shared reading-progress indicator (wiki/reader.md "Progress indicator").
 * Shows "current / total" and a percentage. Format-agnostic: PDF passes page
 * numbers; EPUB (brief 07) passes a location index / total locations. `total`
 * may be `null` while the document is still loading.
 */
export function ProgressIndicator({
  current,
  total,
  unitLabel = "Page",
}: {
  current: number;
  total: number | null;
  unitLabel?: string;
}) {
  const percent = total && total > 0 ? Math.round((current / total) * 100) : null;

  return (
    <div className="flex items-center gap-2 text-sm text-reader-fg/80" aria-live="polite">
      <span className="tabular-nums">
        {unitLabel} {current}
        {total !== null ? ` / ${total}` : ""}
      </span>
      {percent !== null && (
        <span className="rounded bg-reader-surface px-1.5 py-0.5 text-xs tabular-nums text-reader-fg/70">
          {percent}%
        </span>
      )}
    </div>
  );
}
