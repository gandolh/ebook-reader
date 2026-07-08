/**
 * Shared on-screen page navigation (wiki/reader.md "Page nav"). Renders two
 * **invisible click-zones** over the outer thirds of the reading pane (the
 * positioned reader root): a tap/click on the page edge flips the page (Kindle
 * feel) while the page content shows straight through underneath. There are no
 * visible arrow buttons — the page fills the full width.
 *
 * The center third has no zone, so text selection there still works and the
 * toolbar/controls stay clickable. Keyboard arrows are handled separately by
 * `usePageNavKeys`. Format-agnostic: `onPrev`/`onNext` mean the next reading
 * unit — a page for PDF, a location for EPUB (brief 07).
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
      <button
        type="button"
        aria-label="Previous page"
        onClick={onPrev}
        disabled={!canPrev}
        // Mouse-only tap zone (tabIndex -1): transparent, and its focus ring is
        // suppressed so clicking to turn the page paints nothing over the text.
        className="absolute inset-y-0 left-0 z-10 w-1/3 cursor-w-resize bg-transparent outline-none focus:outline-none focus-visible:outline-none disabled:cursor-default"
        tabIndex={-1}
      />
      <button
        type="button"
        aria-label="Next page"
        onClick={onNext}
        disabled={!canNext}
        className="absolute inset-y-0 right-0 z-10 w-1/3 cursor-e-resize bg-transparent outline-none focus:outline-none focus-visible:outline-none disabled:cursor-default"
        tabIndex={-1}
      />
    </>
  );
}
