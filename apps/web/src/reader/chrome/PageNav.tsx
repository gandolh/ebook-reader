import { useReaderStore } from "../../store/reader-store";

/**
 * Shared on-screen page navigation (wiki/reader.md "Page nav"). Renders:
 * - left/right **click-zones** covering the outer thirds of the viewport, so a
 *   tap/click on the page edge flips the page (Kindle feel);
 * - explicit prev/next **arrow buttons** that fade with the chrome.
 *
 * Keyboard arrows are handled separately by `usePageNavKeys` (they're global,
 * not tied to this overlay). Format-agnostic: `onPrev`/`onNext` mean the next
 * reading unit — a page for PDF, a location for EPUB (brief 07).
 *
 * The click-zones sit *below* the chrome (lower z-index) and are click-through
 * on their middle third, so text selection in the center still works and the
 * toolbar/controls stay clickable.
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
  const chromeVisible = useReaderStore((s) => s.chromeVisible);

  return (
    <>
      {/* Click-zones: outer thirds only, so the center third stays selectable. */}
      <button
        type="button"
        aria-label="Previous page"
        onClick={onPrev}
        disabled={!canPrev}
        className="fixed inset-y-0 left-0 z-10 w-1/3 cursor-w-resize bg-transparent disabled:cursor-default"
        tabIndex={-1}
      />
      <button
        type="button"
        aria-label="Next page"
        onClick={onNext}
        disabled={!canNext}
        className="fixed inset-y-0 right-0 z-10 w-1/3 cursor-e-resize bg-transparent disabled:cursor-default"
        tabIndex={-1}
      />

      {/* Explicit arrows — fade with the chrome. */}
      <div
        className={`pointer-events-none fixed inset-y-0 left-0 z-20 flex items-center pl-2 transition-opacity duration-300 ${
          chromeVisible ? "opacity-100" : "opacity-0"
        }`}
      >
        <button
          type="button"
          aria-label="Previous page"
          onClick={onPrev}
          disabled={!canPrev}
          className="pointer-events-auto grid h-11 w-11 place-items-center rounded-full border border-reader-border bg-reader-surface/90 text-reader-fg shadow-md backdrop-blur transition hover:bg-reader-surface disabled:opacity-30"
        >
          <ChevronLeftIcon />
        </button>
      </div>
      <div
        className={`pointer-events-none fixed inset-y-0 right-0 z-20 flex items-center pr-2 transition-opacity duration-300 ${
          chromeVisible ? "opacity-100" : "opacity-0"
        }`}
      >
        <button
          type="button"
          aria-label="Next page"
          onClick={onNext}
          disabled={!canNext}
          className="pointer-events-auto grid h-11 w-11 place-items-center rounded-full border border-reader-border bg-reader-surface/90 text-reader-fg shadow-md backdrop-blur transition hover:bg-reader-surface disabled:opacity-30"
        >
          <ChevronRightIcon />
        </button>
      </div>
    </>
  );
}

function ChevronLeftIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M15 18l-6-6 6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M9 18l6-6-6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
