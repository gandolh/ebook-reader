import { useCallback, useEffect, useRef, useState } from "react";
import { Dialog } from "@base-ui/react/dialog";

import type { SearchMatch, SearchProvider } from "./search-seam";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * SHARED IN-BOOK SEARCH UI  (brief 07 — completes the `search-seam.ts` stub)
 * ─────────────────────────────────────────────────────────────────────────────
 * Format-agnostic search surface reused by BOTH readers (D19). Rendered as a
 * right-anchored Base UI Dialog panel (mirrors `TocDrawer`'s left drawer) so the
 * chrome stays consistent. It knows nothing about PDF/EPUB: it drives a
 * `SearchProvider` (supplied by whichever reader mounts it) and reports the
 * chosen match's opaque `target` back via `onJump`, which the reader resolves
 * (page number for PDF, CFI for EPUB).
 *
 * Reuse contract, same shape as the rest of `chrome/`: no format branching, no
 * renderer imports. PDF (`PdfReader`) and EPUB (`EpubReader`) each build their
 * own provider and pass it in.
 */
export function SearchPanel({
  open,
  onOpenChange,
  provider,
  onJump,
  title = "Search",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Reader-supplied search implementation (PDF text layer / epub.js spine). */
  provider: SearchProvider;
  /** Resolve a match's opaque target (jump to page/CFI) in the reader. */
  onJump: (match: SearchMatch) => void;
  title?: string;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchMatch[] | null>(null);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  // Guards against out-of-order async results (a slow earlier query resolving
  // after a newer one) and against setState after close/unmount.
  const runIdRef = useRef(0);

  // Focus the input when the panel opens; reset state when it closes.
  useEffect(() => {
    if (open) {
      // Base UI mounts the popup async; focus on the next frame.
      const id = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
    setQuery("");
    setResults(null);
    setSearching(false);
    runIdRef.current += 1; // Invalidate any in-flight search.
  }, [open]);

  const runSearch = useCallback(async () => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults(null);
      return;
    }
    const runId = ++runIdRef.current;
    setSearching(true);
    try {
      const matches = await provider.search(trimmed);
      if (runId !== runIdRef.current) return; // Superseded / panel closed.
      setResults(matches);
    } catch {
      if (runId !== runIdRef.current) return;
      setResults([]);
    } finally {
      if (runId === runIdRef.current) setSearching(false);
    }
  }, [query, provider]);

  const onSubmit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      void runSearch();
    },
    [runSearch],
  );

  const onSelect = useCallback(
    (match: SearchMatch) => {
      onJump(match);
      onOpenChange(false);
    },
    [onJump, onOpenChange],
  );

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/40 transition-opacity data-[starting-style]:opacity-0 data-[ending-style]:opacity-0" />
        <Dialog.Popup className="fixed inset-y-0 right-0 z-50 flex w-[85vw] max-w-sm flex-col border-l border-reader-border bg-reader-bg text-reader-fg shadow-xl transition-transform data-[starting-style]:translate-x-full data-[ending-style]:translate-x-full">
          <div className="flex items-center justify-between border-b border-reader-border px-4 py-3">
            <Dialog.Title className="text-base font-semibold">{title}</Dialog.Title>
            <Dialog.Close
              aria-label="Close search"
              className="grid h-8 w-8 place-items-center rounded-md text-reader-fg/70 hover:bg-reader-surface"
            >
              <CloseIcon />
            </Dialog.Close>
          </div>

          <form onSubmit={onSubmit} className="border-b border-reader-border px-4 py-3">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search in book…"
                className="min-w-0 flex-1 rounded-md border border-reader-border bg-reader-surface px-3 py-1.5 text-sm text-reader-fg outline-none focus-visible:ring-2 focus-visible:ring-reader-accent"
              />
              <button
                type="submit"
                disabled={searching || query.trim().length === 0}
                className="shrink-0 rounded-md bg-reader-accent px-3 py-1.5 text-sm font-medium text-white transition disabled:opacity-40"
              >
                {searching ? "…" : "Go"}
              </button>
            </div>
          </form>

          <div className="flex-1 overflow-y-auto px-2 py-2">
            {searching && (
              <p className="px-2 py-4 text-sm text-reader-fg/60">Searching…</p>
            )}
            {!searching && results !== null && results.length === 0 && (
              <p className="px-2 py-4 text-sm text-reader-fg/60">No matches found.</p>
            )}
            {!searching && results !== null && results.length > 0 && (
              <>
                <p className="px-2 pb-1 pt-1 text-xs text-reader-fg/50">
                  {results.length} {results.length === 1 ? "result" : "results"}
                </p>
                <ul>
                  {results.map((match, i) => (
                    <li key={i}>
                      <button
                        type="button"
                        onClick={() => onSelect(match)}
                        className="block w-full rounded-md px-2 py-2 text-left text-sm text-reader-fg/85 hover:bg-reader-surface"
                      >
                        {match.label ? (
                          <span className="mb-0.5 block text-xs font-medium text-reader-fg/60">
                            {match.label}
                          </span>
                        ) : null}
                        <span className="line-clamp-3 text-reader-fg/85">
                          {match.excerpt}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
