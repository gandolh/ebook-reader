import { useEffect, useRef } from "react";
import type { LibraryBook } from "@ebook-reader/shared";

import { useReaderStore, type ReaderLocation } from "../store/reader-store";
import { updateProgress } from "./library-api";
import { listPendingProgress, markLocalProgressSynced, putLocalProgress } from "./offline-store";

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
 *
 * Offline (brief 20): every debounced tick ALSO writes a local progress record
 * (IndexedDB), so reading position survives offline and a reload. When the PATCH
 * succeeds the local record is marked synced; when it fails (offline) the record
 * stays pending and `flushPendingProgress` / `useReconnectProgressSync` push it
 * once on reconnect — last-write-wins, no queue of intermediate positions.
 */
const DEBOUNCE_MS = 1200;

/** Match tolerance for the coarse progress fraction when comparing to a server row. */
const FRACTION_EPSILON = 1e-4;

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
      const updatedAt = Date.now();
      // Persist locally FIRST so offline reading position survives even when the
      // PATCH can't go out; then attempt the server write (best-effort).
      void putLocalProgress(bookId, { fraction, locator, updatedAt });
      void updateProgress(bookId, fraction, locator)
        .then(() => markLocalProgressSynced(bookId, updatedAt))
        .catch(() => {
          // Offline / server down: the local record stays pending and is pushed
          // once on reconnect (last-write-wins).
        });
    }, DEBOUNCE_MS);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [bookId, fraction, location]);
}

/**
 * Push every pending local progress record once (last-write-wins), skipping any
 * whose value already matches its freshly-fetched server row. `rows` is the live
 * library list (the current server truth) so we don't PATCH a position the
 * server already holds — keeping the reconnect flush idempotent (no PATCH spam).
 *
 * Because the wire `LibraryBook` carries no per-user progress timestamp, "newer
 * than the server" is inferred from the local pending flag (`updatedAt >
 * syncedAt`, tracked in the store) plus value divergence from the fetched row.
 */
/**
 * Single-flight latch. `useReconnectProgressSync`'s effect can re-run (renders,
 * the `online` event) while a flush is still awaiting its PATCHes; without a
 * guard, overlapping runs each read the same still-pending rows and PATCH them
 * again (observed: 3× per row). Coalescing overlapping calls onto one in-flight
 * run guarantees one PATCH per pending book per reconnect. A run started AFTER
 * the current one finishes still picks up anything left pending.
 */
let flushInFlight: Promise<void> | null = null;

export function flushPendingProgress(rows: LibraryBook[]): Promise<void> {
  if (flushInFlight) return flushInFlight;
  flushInFlight = doFlushPendingProgress(rows).finally(() => {
    flushInFlight = null;
  });
  return flushInFlight;
}

async function doFlushPendingProgress(rows: LibraryBook[]): Promise<void> {
  const pending = await listPendingProgress();
  if (pending.length === 0) return;
  const byId = new Map(rows.map((r) => [r.id, r]));
  for (const p of pending) {
    const row = byId.get(p.id);
    const alreadyOnServer =
      row != null &&
      (row.locator ?? null) === p.locator &&
      Math.abs(row.progress - p.fraction) < FRACTION_EPSILON;
    if (alreadyOnServer) {
      // Server already holds this position — just clear the pending flag.
      await markLocalProgressSynced(p.id, p.updatedAt);
      continue;
    }
    try {
      await updateProgress(p.id, p.fraction, p.locator);
      await markLocalProgressSynced(p.id, p.updatedAt);
    } catch {
      // Still unreachable — leave pending for the next reconnect.
    }
  }
}

/**
 * Drive `flushPendingProgress` on app start and on every `online` event, using
 * the live library rows for the value comparison. Mount this once where the
 * library list is known (the library page). Safe no-op with no pending records.
 */
export function useReconnectProgressSync(rows: LibraryBook[] | undefined): void {
  useEffect(() => {
    if (!rows) return;
    void flushPendingProgress(rows);
    const onOnline = () => void flushPendingProgress(rows);
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [rows]);
}
