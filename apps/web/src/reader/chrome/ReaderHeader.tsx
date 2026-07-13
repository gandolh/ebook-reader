/**
 * Running orientation header — the top row of BOTH readers' 3-row grid
 * (wiki/reader.md: "orientation lives at the edges"). Extracted from the EPUB
 * reader (chunk 14) so PDF and EPUB present the SAME frame: same treatment,
 * same fade, so only the page content differs.
 *
 * In-flow (not overlaid): it keeps its grid row so the content column never
 * shifts when the chrome fades. Purely decorative — `aria-hidden` and
 * non-interactive; the real title/nav live in the toolbar and page.
 */
export function ReaderHeader({
  title,
  detail,
  visible,
}: {
  /** Left slot — the book title (best-effort; blank renders gracefully). */
  title?: string | null;
  /** Right slot — the running location (EPUB chapter / PDF section). */
  detail?: string | null;
  /** Fades WITH the chrome, matching the toolbar/rail auto-hide. */
  visible: boolean;
}) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none flex items-baseline justify-between gap-6 px-6 py-2.5 text-xs text-reader-fg/50 transition-opacity duration-300 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      <span className="min-w-0 truncate">{title ?? ""}</span>
      <span className="min-w-0 truncate text-right">{detail ?? ""}</span>
    </div>
  );
}
