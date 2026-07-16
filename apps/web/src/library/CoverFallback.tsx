/**
 * The typographic fallback tile for a missing cover (wiki/design.md "Cards
 * (book covers)"): a tinted `paper-container` ground with the title set in
 * Playfair (the "Dune" / "Design Systems" style from the mockup). Extracted
 * from `CoverCard` (brief 22) so the `/discover` catalog cards can render the
 * identical treatment instead of duplicating it.
 */
export function CoverFallback({ title }: { title: string }) {
  return (
    <span className="flex h-full w-full flex-col items-center justify-center gap-3 px-4 text-center">
      <BookGlyph className="h-8 w-8 text-ink-variant/50" />
      <span className="font-display text-lg leading-tight font-semibold text-ink">{title}</span>
    </span>
  );
}

function BookGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className={className} aria-hidden>
      <path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H12v16H5.5A1.5 1.5 0 0 0 4 20.5z" strokeLinejoin="round" />
      <path d="M20 4.5A1.5 1.5 0 0 0 18.5 3H12v16h6.5a1.5 1.5 0 0 1 1.5 1.5z" strokeLinejoin="round" />
    </svg>
  );
}
