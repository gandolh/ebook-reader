import { useEffect, useRef } from "react";

import { useReaderStore, type ReaderLocation } from "../store/reader-store";
import { updateProgress } from "./library-api";

/**
 * Persists reading progress back to the library, per-user (D24). Watches the
 * active reader's `progressFraction` (drives the cover bar) AND its exact
 * `currentLocation` (page number / CFI), and PATCHes both to
 * `/library/:id/progress`, debounced so page turns don't hammer the server.
 * No-op when the current book wasn't opened from the library (`loadedBookId ===
 * null`, e.g. dev samples).
 *
 * The saved locator is what lets a refresh / reopen land back on the exact page
 * the user left off at (the reader seeds its start position from it).
 */
const DEBOUNCE_MS = 1200;

/** Serialize the reader's location to the opaque wire locator (page → string). */
function serializeLocator(location: ReaderLocation): string | null {
  if (location === null) return null;
  return typeof location === "number" ? String(location) : location;
}

export function useProgressSync() {
  const bookId = useReaderStore((s) => s.loadedBookId);
  const fraction = useReaderStore((s) => s.progressFraction);
  const location = useReaderStore((s) => s.currentLocation);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSent = useRef<string | null>(null);

  useEffect(() => {
    if (!bookId || fraction === null) return;
    const locator = serializeLocator(location);
    // Dedupe: skip when neither the position nor the (rounded) fraction moved
    // since the last send, so a settled reader doesn't PATCH on a loop.
    const signature = `${locator ?? ""}|${fraction.toFixed(4)}`;
    if (signature === lastSent.current) return;

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      lastSent.current = signature;
      void updateProgress(bookId, fraction, locator).catch(() => {
        // Best-effort; a failed sync just means the resume point lags a turn.
      });
    }, DEBOUNCE_MS);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [bookId, fraction, location]);
}
