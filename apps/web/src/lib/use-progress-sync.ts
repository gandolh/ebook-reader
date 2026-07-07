import { useEffect, useRef } from "react";

import { useReaderStore } from "../store/reader-store";
import { updateProgress } from "./library-api";

/**
 * Persists reading progress back to the library (D24). Watches the active
 * reader's reported `progressFraction` and PATCHes `/library/:id/progress`,
 * debounced so page turns don't hammer the server. No-op when the current book
 * wasn't opened from the library (`loadedBookId === null`, e.g. dev samples).
 *
 * Reading *position* (exact page/CFI) stays session-only (D9); this syncs only
 * the coarse 0..1 fraction the cover's progress bar shows.
 */
const DEBOUNCE_MS = 1200;

export function useProgressSync() {
  const bookId = useReaderStore((s) => s.loadedBookId);
  const fraction = useReaderStore((s) => s.progressFraction);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSent = useRef<number | null>(null);

  useEffect(() => {
    if (!bookId || fraction === null) return;
    // Skip tiny deltas (page turns within the same ~1% bucket).
    if (lastSent.current !== null && Math.abs(fraction - lastSent.current) < 0.005) {
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      lastSent.current = fraction;
      void updateProgress(bookId, fraction).catch(() => {
        // Best-effort; a failed sync just means the bar lags until next turn.
      });
    }, DEBOUNCE_MS);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [bookId, fraction]);
}
