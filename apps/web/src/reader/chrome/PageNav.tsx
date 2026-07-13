/**
 * Shared on-screen page navigation (wiki/reader.md "Page nav"). Renders two
 * VISIBLE full-height edge bars over the left/right margins of the reading pane
 * (the positioned reader root). Each bar is faintly tinted with a hairline inner
 * border so the reader can see where the flip zone begins and the page ends, and
 * carries a centered chevron marking its action. Clicking a bar flips the page;
 * clicking the page BODY does nothing — the bars are the only pointer affordance
 * (keyboard arrows still flip, handled separately by `usePageNavKeys`).
 *
 * Only mounted in paged mode (the reader gates on `!isScroll`) — in continuous
 * scroll there are no discrete pages to flip. Format-agnostic: `onPrev`/`onNext`
 * mean the next reading unit — a page for PDF, a location for EPUB.
 */
export function PageNav({
  onPrev,
  onNext,
  canPrev,
  canNext,
}: {
  onPrev: () => void;
  onNext: () => void;
  canPrev: boolean;
  canNext: boolean;
}) {
  return (
    <>
      <EdgeBar side="left" label="Previous page" onClick={onPrev} disabled={!canPrev} />
      <EdgeBar side="right" label="Next page" onClick={onNext} disabled={!canNext} />
    </>
  );
}

/**
 * A single full-height page-flip bar pinned to one edge of the reading pane.
 * "Slightly visible": a faint fill + a hairline inner border delineate it from
 * the page; hover deepens both. `tabIndex={-1}` keeps it out of the tab order
 * (keyboard users page with the arrow keys); when the flip isn't possible the
 * bar fades out and stops taking clicks rather than sitting there dead.
 */
function EdgeBar({
  side,
  label,
  onClick,
  disabled,
}: {
  side: "left" | "right";
  label: string;
  onClick: () => void;
  disabled: boolean;
}) {
  const isLeft = side === "left";
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      tabIndex={-1}
      className={`absolute inset-y-0 z-10 grid w-9 place-items-center bg-reader-fg/[0.03] text-reader-fg/40 outline-none transition hover:bg-reader-fg/[0.07] hover:text-reader-fg/80 focus:outline-none focus-visible:outline-none disabled:pointer-events-none disabled:opacity-0 sm:w-12 ${
        isLeft
          ? "left-0 cursor-w-resize border-r border-reader-border/60"
          : "right-0 cursor-e-resize border-l border-reader-border/60"
      }`}
    >
      <Chevron dir={side} />
    </button>
  );
}

// Line chevron matching the reader chrome's 1.75-stroke style (design.md "Icons").
function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d={dir === "left" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"}
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
